"use strict"
/*
	Tripio
	Chatbot de preguntas y respuestas para CMR BI
	Inteligencia Artificial Practia 2018
	----
	Tripio entrega información sobre cartera de clientes para usuarios internos

*/

// Requerimientos externos
require('dotenv').config()
const restify = require("restify")
const cookieParser = require('restify-cookies')
const builder = require("botbuilder")
const azure = require("botbuilder-azure")
const rp = require("request-promise-native")

// Herramientas QABot
const obtenerRespuesta = require("./herramientas/obtener_respuesta")

const webChat = require("./herramientas/webchat")

// Iniciar servidor Restify y MS Chat Connector
function iniciarAPI() {
	return new Promise((resolve, reject) => {

		//  Servidor Restify
		var servidor = restify.createServer()
		servidor.use(cookieParser.parse)
		servidor.use(restify.plugins.bodyParser({
			mapParams: true
		}))
		servidor.listen(process.env.PORT || 3978, function () {
			resolve(servidor)
		})

	})
}

// Iniciar bot (Bot Builder), almacenamiento en Cosmos DB, LUIS
function iniciarBot() {

	return new Promise((resolve, reject) => {

		// ChatConnector
		global.CHATCONNECTOR = new builder.ChatConnector({
			appId: process.env.APP_ID,
			appPassword: process.env.APP_LLAVE,
			openIdMetadata: process.env.BotOpenIdMetadata
		})

		// Datos de configuración de Base de Datos para sesión del bot
		var docDbClient = new azure.DocumentDbClient({
			host: process.env.MONGODB_HOST_BOTDATA,
			masterKey: process.env.MONGODB_LLAVE,
			database: process.env.MONGODB_BASE,
			collection: process.env.MONGODB_COLECCION_BOT
		})
		var cosmosStorage = new azure.AzureBotStorage({gzipData: false}, docDbClient)

		// Iniciar bot y conversación
		// Este es el diálogo que usa el bot para responder.
		// Como esta implementación es sólo para preguntas y respuestas no tiene sistema de diálogos
		var bot = new builder.UniversalBot(CHATCONNECTOR, [
			(session, args, next) => {

				// Mensaje especial de presentación
				if ( session.message.type = "text" && session.message.text == "___presentacion___" ) {
					obtenerRespuesta("sistema:presentacion")
					.then((respuesta) => {
						console.log("  Enviando presentación: " + respuesta)
						session.send(respuesta)
					})
					.catch((error) => {
							console.log("  Excepción obteniendo la presentación desde la base de datos")
							console.log(error)
					})

				// Otros mensajes de texto (preguntas y respuestas)
				} else if ( session.message.type = "text" && typeof session.message.text != "undefined" ) {
					// Envío el mensaje al servicio de LUIS para detectar la intención
					rp({
						method: "GET",
						uri: "https://" + process.env.LUIS_UBICACION + ".api.cognitive.microsoft.com/luis/v2.0/apps/" + process.env.LUIS_ID_APLICACION + "?subscription-key=" + process.env.LUIS_LLAVE + "&verbose=true&timezoneOffset=" + process.env.LUIS_DIFERENCIA_HORA + "&q=" + session.message.text
					})
					.then((respuesta_luis) => {
						// Parseo y verifico la respuesta
						respuesta_luis = respuesta_luis ? JSON.parse(respuesta_luis) : null
						var intencion = null
						if ( respuesta_luis && typeof respuesta_luis.topScoringIntent != "undefined" && respuesta_luis.topScoringIntent.intent != "None" ) {
							intencion = respuesta_luis.topScoringIntent.intent
						} else if ( respuesta_luis ) {
							// LUIS me respondió pero no pude detectar la intención, respondo "no te entendí"
							console.log("  No pude detectar la intención del mensaje usando LUIS")
							intencion = "sistema:no_te_entendi"
						} else {
							// El servicio de LUIS no me respondió o hubo un error, respondo "tuve un problema"
							console.log("  No obtuve una respuesta de LUIS")
							intencion = "sistema:tuve_un_problema"
						}
						obtenerRespuesta(intencion)
						.then((respuesta) => {
							LOGGER.pregunta({
								"usuario": {
									id: session.message.address.user.id,
									nombre: session.message.address.user.name
								},
								"canal": session.message.address.channelId,
								"direccion": session.message.address,
								"textoPregunta": session.message.text,
								"luis": respuesta_luis,
								"textoRespuesta": respuesta,
								"fecha": new Date()
							})
							console.log("  Enviando respuesta: " + respuesta)
							session.send(respuesta)
						})
						.catch((error) => {
							 console.log("  Excepción obteniendo la respuesta a la intención")
							 console.log(error)
						})
					})
					.catch((ex) => {
						console.log("  Error! Excepción no capturada en el código de pregunta")
						LOGGER.sistema("ERROR","DIALOGO", "Chatbot " + process.env.BOT_NOMBRE + " no pudo iniciar normalmente", {"fecha": new Date(), "excepcion": ex})
						console.log(ex)
					})
				} else {
					console.log("  Mensaje no es texto")
				}
			}
		])
		.set("storage", cosmosStorage)

		resolve(bot)
	})
}

// Tripio
// Función principal
// Carga, inicia, rehidrata, reactiva

async function iniciarTripio() {
	try {
		// Inicia todos los componentes de forma asíncrona y se cae si falla algo
		console.log("\n  --\n  QABot\n  Chatbot de preguntas y respuestas\n  Inteligencia Artificial Practia\n  --\n")
		console.log("  Iniciando " + process.env.BOT_NOMBRE + ", " + process.env.BOT_DESCRIPCION + "\n")

		console.log("  Conectando a base de datos...")
		global.BDD = await require("./servicios/mongodb")
		console.log("  Base de datos OK")

		console.log("  Iniciando logger...")
		global.LOGGER = await require("./herramientas/logger")
		console.log("  Logger OK")

		console.log("  Iniciando bot...")
		global.BOT = await iniciarBot()
		console.log("  Bot OK")

		console.log("  Iniciando API...")
		global.API = await iniciarAPI()

		// Rutas API

		// Mensajes al chatbot
		API.post("/api/messages", CHATCONNECTOR.listen())

		// Webchat
		API.get("/webchat", (req, res, next) => {
			webChat.main(req, res, next)
		})
		API.post("/webchat", (req, res, next) => {
			webChat.main(req, res, next)
		})
		API.post("/webchat/feedback", (req, res, next) => {
			console.log("\n  Feedback recibido!")
			console.log(req.params)
			if ( req.params && typeof req.params.tipo != "undefined" && typeof req.params.pregunta != "undefined" ) {
				BDD.collection(process.env.MONGODB_COLECCION_LOG_PREGUNTAS).findOne({"direccion.id": req.params.pregunta})
				.then((pregunta) => {
					if (  pregunta ) {
						console.log("  Fedback: Pregunta encontrada")
						BDD.collection(process.env.MONGODB_COLECCION_LOG_PREGUNTAS).updateOne({"direccion.id": req.params.pregunta}, {$set: {"feedback": req.params.tipo}})
						.then((resultado) => {
							if ( resultado.modifiedCount > 0 ) {
								console.log("  Feedback modificado")
							} else {
								console.log("  Feedback no modificado")
							}
							res.send("OK")
						})
						.catch((error) => {
							console.log("  error guardando el feedback")
							console.log(error)
							res.send("Error guardando el feedback: " + error)
						})
					} else {
						console.log("  Feedback: No encontré la pregunta")
						res.send("Error: la pregunta no existe: " + req.params.pregunta)
					}
				})
				.catch((error) => {
					console.log("  error en feedback")
					console.log(error)
					res.send("Error general en feedback: " + error)
				})
			} else {
				res.send("Error: faltan parámetros")
			}
		})

		console.log("  API OK")

		await require("./herramientas/admin")

		//LOGGER.sistema("INFORMACION", "SISTEMA", "Chatbot " + process.env.BOT_NOMBRE + " iniciado", {"fecha": new Date()})
		console.log("  " + process.env.BOT_NOMBRE + " arriba, esperando preguntas <3\n")

	} catch(ex) {
		//LOGGER.sistema("ERROR_FATAL", "SISTEMA", "Chatbot " + process.env.BOT_NOMBRE + " no pudo iniciar normalmente", {"fecha": new Date(), "excepcion": ex})
		console.log("- - - - - - - - - - - - - - - - - - - -\nError iniciando " + process.env.BOT_NOMBRE + "\n")
		console.log("Código: " + ex.code + "\nMensaje: " + ex.message + "\nStack trace:\n")
		console.log(ex.error)
		//console.log(ex.stack + "\n- - - - - - - - - - - - - - - - - - - -")
		process.exit(1)
	}
}

iniciarTripio()

"use strict"
/*  QABot Chatbot
	Herramienta: Entrenar LUIS
	Toma las intenciones y ejemplos de la BDD y entrena el modelo de LUIS vía API
*/

//  Librerías externas
const rp = require("request-promise-native")
const async = require("async")
//  Funciones

//  ForEach asíncrono
async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array)
	}
}

//  Agregar una intención al modelo
function agregarIntencion(intencion) {
	return new Promise((resolve, reject) => {
		rp({
			method: 'POST',
			uri: "https://" + process.env.LUIS_UBICACION + ".api.cognitive.microsoft.com/luis/api/v2.0/apps/" + process.env.LUIS_ID_APLICACION + "/versions/" + process.env.LUIS_VERSION + "/intents",
			headers: {
				"Content-Type": "application/json",
				"Ocp-Apim-Subscription-Key": process.env.LUIS_LLAVE
			},
			body: {
				name: intencion.nombre
			},
			json: true
		})
		.then((respuesta_luis) => {
			//console.log(respuesta_luis)
			console.log("  Intención creada")
			resolve()
		})
		.catch((error) => {
			//console.log(error)
			//console.log(error.error)
			if ( error.error.code == "BadArgument" || ( error.error.error && error.error.error.code == "BadArgument" ) ) {
				//  La intención ya existe en el modelo
				console.log("  Intención ya existe")
				resolve()
			} else {
				console.log(error)
				reject("Error agregando la intención al modelo")
			}
		})
	})
}

//  Agregar ejemplos a un intención
function agregarEjemplos(intencion) {
	return new Promise(async (resolve, reject) => {
		let indice = 0
		let ejemplos = []
		ejemplos[indice] = []
        let total = 0
        let maximo = 70

		await asyncForEach(intencion.ejemplos, (ejemplo) => {
            ++total
			if ( ejemplos[indice].length < 98 && total < maximo ) {
                ejemplos[indice].push({"intentName": intencion.nombre, "text": ejemplo})
                if ( ejemplo.match(/[áéíóúÁÉÍÓÚ¿¡].*/g) ) {
                    console.log(ejemplo)
    				ejemplos[indice].push({"intentName": intencion.nombre, "text": ejemplo.normalize('NFD').replace(/[\u0300-\u036f]/g, "")})
                }
            } else if ( total >= maximo ) {
                //console.log("+" + total)
            } else {
				++indice
				ejemplos[indice] = []
				ejemplos[indice].push({"intentName": intencion.nombre, "text": ejemplo})
				if ( ejemplo.match(/[áéíóúÁÉÍÓÚ¿¡].*/g) ) {
                    console.log(ejemplo)
    				ejemplos[indice].push({"intentName": intencion.nombre, "text": ejemplo.normalize('NFD').replace(/[\u0300-\u036f]/g, "")})
                }
            }
		})
		console.log("  Agregando " + intencion.ejemplos.length + " ejemplos en " + ejemplos.length + " peticiones")
		async.eachOfSeries(ejemplos, (lote, i, cb_ejemplos) => {
            console.log("  Lote de " + lote.length)
			//console.log("  Lote...")
			rp({
				method: 'POST',
				uri: "https://" + process.env.LUIS_UBICACION + ".api.cognitive.microsoft.com/luis/api/v2.0/apps/" + process.env.LUIS_ID_APLICACION + "/versions/" + process.env.LUIS_VERSION + "/examples",
				headers: {
					"Content-Type": "application/json",
					"Ocp-Apim-Subscription-Key": process.env.LUIS_LLAVE
				},
				body: JSON.stringify(lote)
			})
			.then((respuesta_luis) => {
                if (  respuesta_luis.indexOf("Examples count cannot exceed the limit") >= 0 ) {
                    console.log("  Alcanzamos el límite de 15K intenciones en el modelo de LUIS!")
                    console.log("  Error fataaaaaaaal\n")
                    process.exit(0)
                } else if ( respuesta_luis.indexOf("\"hasError\":true") >= 0 ) {
					console.log(respuesta_luis)
				} else {
					console.log("  " + (i+1) + "/" + ejemplos.length + " OK")
				}
				//console.log("  Lote OK")
				cb_ejemplos()
				/*setTimeout(() => {
					console.log("  res exmpl")
					resolve()
				})*/
			})
			.catch((error) => {
				console.log(error.error)
				reject("Error agregando ejemplos")
			})
		},
		(error) => {
			if ( error ) {
				console.log(error)
			} else {
				console.log("  OK loop ejemplos")
				resolve()
			}
		})
	})
}

//  Función principal, inicia el entrenamiento
module.exports = () => {
	return new Promise((resolve, reject) => {
		BDD.collection(process.env.MONGODB_COLECCION_INTENCIONES).find({}).toArray(async (error, intenciones) => {
			if ( error ) {
				console.log(error)
				reject("Error cargando intenciones")
			} else {
				console.log("\n  ---\n  Iniciando entrenamiento de intenciones en LUIS\n  ---")
				console.log("  Hay " + intenciones.length)
				await asyncForEach(intenciones, async (elemento) => {
					console.log("\n  Procesando intención: " + elemento.nombre)
					await agregarIntencion(elemento)
					await agregarEjemplos(elemento)
					console.log("  Intención " + elemento.nombre + " OK")
				})
				console.log('\n  ---\n  Entrenamiento de intenciones terminado!\n  ---')
				resolve("Entrenamiento listo")
			}
		})
	})
}
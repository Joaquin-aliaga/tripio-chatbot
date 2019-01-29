"use strict"
/*  QABot Chatbot
    Herramienta: Logger
    Inserta los distintos logs en la base de datos en el formato que corresponde

    conversacion: Logs de conversación
    sistema: Logs de sistema
*/

function logger() {
	return new Promise(function(resolve, reject) {
		var logger = {
            ObjectId: require('mongodb').ObjectID,
            tipos_sistema: {
                "niveles": [
                    "INFORMACION",
                    "ALERTA",
                    "ERROR",
                    "ERROR_FATAL"
                ],
                "fuentes": [
                    "SISTEMA",
                    "MIDDLEWARE",
                    "DIALOGO",
                    "HERRAMIENTAS",
                    "SERVICIOS",
                    "WEBCHAT"
                ]
            },
            sistema: function(tipo, fuente, texto, detalle) {

                if ( this.tipos_sistema.niveles.indexOf(tipo) == -1 || this.tipos_sistema.fuentes.indexOf(fuente) == -1 ) {
                    var datos = {
                        "fecha": new Date(),
                        "tipo": "ERROR",
                        "fuente": "LOGGER",
                        "texto": "Tipo o fuente incorrecto"
                    }
                    datos.detalle = {
                        "tipo_original": tipo,
                        "fuente_original": fuente,
                        "texto_original": texto,
                        "detalle_original": detalle
                    }
                } else {
                    var datos = {
                        "fecha": new Date(),
                        "tipo": tipo,
                        "fuente": fuente,
                        "texto": texto
                    }
                    if ( detalle ) {
                        datos.detalle = detalle
                    }
                }
				console.log("  $ LOG [" + tipo + "] " + fuente + ": " + texto)
				if ( datos.detalle ) {
					console.log(datos.detalle)
				}
                try {
                    BDD.collection(process.env.MONGODB_COLECCION_LOG_SISTEMA).insertOne(datos).then((resultado) => {
                        return resultado.insertedCount > 0
                    })
                }
                catch(error) {
                    console.log("  ----------\n  Error de MongoDB\nLogger: evento de sistema")
                    console.log(error)
                    console.log("  ----------")
                }
            },
            pregunta: function(pregunta) {
                if ( typeof pregunta == "object" ) {
                    try {
                        BDD.collection(process.env.MONGODB_COLECCION_LOG_PREGUNTAS).insertOne(pregunta).then((resultado) => {
                            if ( resultado.insertedCount > 0 ) {
                                console.log("  Pregunta registrada OK")
                            } else {
                                console.log("  Error registrando pregunta en BDD")
                                console.log(resultado)
                            }
                        })
                    }
                    catch(error) {
                        console.log("  ----------\n  Error de MongoDB\nLogger: pregunta")
                        console.log(error)
                        console.log("  ----------")
                    }
                }
            },
            webchat: function(usuario) {
                if ( typeof usuario == "object" ) {
                    try {
                        var datos = {
                            "fecha": new Date(),
                            "usuario": usuario
                        }
                        BDD.collection(process.env.MONGODB_COLECCION_LOG_WEBCHAT).insertOne(datos).then((resultado) => {
                            if ( resultado.insertedCount > 0 ) {
                                console.log("  Acceso a webchat registrado OK")
                                //console.log(datos)
                            } else {
                                console.log("  Error registrando acceso a webchat en BDD")
                                console.log(resultado)
                            }
                        })
                    }
                    catch(error) {
                        console.log("  ----------\n  Error de MongoDB\nLogger: webchat")
                        console.log(error)
                        console.log("  ----------")
                    }
                }
            }
        }
        resolve(logger)
	})

}

module.exports = logger()

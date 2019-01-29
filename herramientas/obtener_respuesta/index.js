"use strict"
/*  QABot Chatbot
    Herramienta: Obtener Respuesta
    Busca las respuestas para la intención en la base de datos y elige una alternativa
*/

module.exports = function(nombre_intencion) {
    return new Promise((resolve, reject) => {
        if ( nombre_intencion && nombre_intencion.indexOf("sistema:") == 0 ) {
            nombre_intencion = nombre_intencion.split(":")
            nombre_intencion = nombre_intencion[1]
            console.log("  La intención de sistema es: " + nombre_intencion)
            BDD.collection(process.env.MONGODB_COLECCION_RESPUESTAS_SISTEMA).findOne({"nombre": nombre_intencion}).then((intencion) => {
                if ( intencion ) {
                    resolve(intencion.respuestas[Math.floor(Math.random() * intencion.respuestas.length)])
                } else {
                    reject("No se encontró la intención de sistema en la BDD")
                }
            })
            .catch((error) => {
                console.log("  Excepción tratando de cargar una respuesta")
                console.log(error)
                reject("Error cargando respuestas desde BDD")
            })
        } else if ( nombre_intencion ) {
            console.log("  La intención es: " + nombre_intencion)
            BDD.collection(process.env.MONGODB_COLECCION_INTENCIONES).findOne({"nombre": nombre_intencion}).then((intencion) => {
                if ( intencion ) {
                    var respuesta = intencion.respuestas[Math.floor(Math.random() * intencion.respuestas.length)]
                    if ( respuesta.indexOf("$respuesta$") >= 0 && typeof intencion.dato != "undefined" ) {
                        resolve(respuesta.replace("$respuesta$", intencion.dato))
                    } else {
                        resolve(respuesta)
                    }
                } else {
                    reject("No se encontró la intención en la BDD")
                }
            })
            .catch((error) => {
                console.log("  Excepción tratando de cargar una respuesta")
                console.log(error)
                reject("Error cargando respuestas desde BDD")
            })
        } else {
            reject("El nombre de la intención viene en blanco")
        }
    })
}
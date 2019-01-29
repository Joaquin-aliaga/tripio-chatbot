"use strict"
/*  QABot Chatbot
	Herramienta: Admin
	Página especial de administración para iniciar el entrenamiento de LUIS y 
*/

// Herramientas
//const rp = require("request-promise-native")
//const jwt_decode = require("jwt-decode")
const entrenarLUIS = require("../entrenar_luis")

function a() {

    //  Get, interfaz para iniciar acciones
    API.get("/admin", (req, res, next) => {
        if ( req.cookies["usuarioTripio"] == "f8j36gfd6ibs" ) {
            var body = `<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<title>CMR Tripio</title>
		<script src="https://code.jquery.com/jquery-3.3.1.min.js"></script>
		<link rel="stylesheet" href="https://unpkg.com/purecss@1.0.0/build/pure-min.css" integrity="sha384-nn4HPE8lTHyVtfCBi5yW9d20FjT8BJwUXyWZT9InLYax14RDjBj46LmSztkmNP9w" crossorigin="anonymous">
		<style type="text/css">
            a{text-decoration:none}
			#cabecera {
				position: fixed;
			    top: 0;
    			left: 0;
    			right: 0;
    			height: 80px;
				background-color: #4d833f;
				color: white;
				padding: 10px;
				text-align: left;
			}
			#cabecera h1{font-size:2em;margin:.4em 0 0 0}
			#cabecera p{margin:0;font-size:.9em;color:#e3ffe4}
			#mensajes {
				padding: 10px 20px;
				position: fixed;
				top: 100px;
				bottom: 100px;
				left: 0;
				right: 0;
				overflow: hidden;
				overflow-y: scroll;
			}
			.mensaje {
				background: #fff;
				margin: 10px auto 10px auto;
				border: 1px solid #eee;
				clear: both;
				max-width: 800px
			}
			.mensaje p {margin:10px}
			.mensaje .info {
				margin-top: 5px;
				overflow:hidden;
				font-size:.75em;
				padding:6px 10px;
			}
            .mensaje textarea{margin:10px;width:50%}
            .mensaje button{margin:10px}
            fieldset{margin:0;border:none;padding:0}
		</style>
        </head>
	<body>
		<div id="cabecera">
			<h1>Tripio, administración</h1>
		</div>
		<div id="mensajes">
            <div class="mensaje">
                <form name="iniciar_entrenamiento" method="post">
                    <fieldset>
                        <p>Este boton inicia el entrenamiento del modelo de Microsoft LUIS</p>
                        <input type="hidden" name="operacion" value="iniciar_entrenamiento">
                        <button type="submit">Iniciar entrenamiento</btton>
                    </fieldset>
                </form>
            </div>
            <div class="mensaje">
                <form name="actualizar_datos" method="post">
                    <fieldset>
                        <p>Esta sección permite actualizar los datos variables de las respuestas</p>
                        <input type="hidden" name="operacion" value="cargar_respuestas">
                        <textarea name="datos" placeholder="Pega acá el CSV con las respuestas"></textarea><br>
                        <button type="submit">Actualizar datos</button>
                    </fieldset>
                </form>
            </div>
		</div>
	</body>
</html>`
            res.writeHead(200, {
                'Content-Length': Buffer.byteLength(body),
                'Content-Type': 'text/html'
            })
            res.write(body)
            res.end()
        } else {
            res.redirect("/webchat", next)
        }
    })

    // Post, acciones
    API.post("/admin", (req, res, next) => {
        //  Validamos con la cookie del webchat
        if ( req.cookies["usuarioTripio"] == "f8j36gfd6ibs" ) {
            //  Iniciar entrenamiento de LUIS
            if ( req.params.operacion && req.params.operacion == "iniciar_entrenamiento" ) {
                entrenarLUIS()
			    res.send("Entrenamiento iniciado")
            } else if ( req.params.operacion && req.params.operacion == "cargar_respuestas" && req.params.datos ) {
                res.send("Cargando datos")
                var datos = req.params.datos.split("\n")
                var insertados = 0
                if ( datos.length > 0 ) {
                    datos.forEach((v, i, a) => {
                        var data = v.split(";")
                        if ( typeof data[0] != "undefined" && typeof data[1] != "undefined" ) {
                            BDD.collection(process.env.MONGODB_COLECCION_INTENCIONES).updateOne({"nombre": data[0]}, { $set: {"dato": data[1]}}).then((res) => {
                                ++insertados
                                //console.log("  Dato: " + i + " : " + data[0] + " : " + (res.result.ok == 1 ? "OK" : "error"))
                                if ( insertados == datos.length ) {
                                    console.log("  +" + insertados)
                                    console.log("  Datos insertados OK")
                                } else {
                                    console.log("  +" + insertados)
                                }
                            })
                        }
                    })
                }
            } else {
                res.redirect("/admin", next)
            }
        } else {
            res.redirect("/webchat", next)
        }
    })
}

module.exports = a()
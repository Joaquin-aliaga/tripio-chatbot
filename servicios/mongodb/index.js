"use strict"
/*  QABot Chatbot
    Servicio: Base de datos MongoDB
    Conecta a la base de datos y devuelve el objeto con la conexión
*/

function mongodb() {

	return new Promise(function(resolve, reject) {
		const mongoClient = require('mongodb').MongoClient
		mongoClient.connect("mongodb://" + encodeURIComponent(process.env.MONGODB_USUARIO) + ":" + encodeURIComponent(process.env.MONGODB_LLAVE) + "@" + process.env.MONGODB_HOST,  { useNewUrlParser: true }, function (err, client) {
    		if (err) {
				reject(err)
			} else {
				let BDD = client.db(process.env.MONGODB_BASE)
				resolve(BDD)
			}
		})
	})

}

module.exports = mongodb()
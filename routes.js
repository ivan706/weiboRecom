/*route file
* author Ivan Wang@CCTU
*/
var fs = require("fs")

module.exports = function(app){
	var list = fs.readdirSync(__dirname + '/lib')

	for (var e; list.length && (e = list.shift());){
		var m = require('./lib/'+e)
		m.init && m.init(app)
	}
}
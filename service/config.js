var	Factory
=	function()
	{
		return	{
				paths: 
				{
						"input": ["../../../api/test_service/","../../../api/service/"]
					,	"lib": "../lib/"
					,	"public": "/../public/"
					,	"server_log": "server.log"
				}
			,	server: 
				{
						base : "/api/data"
					,	host : "trabajando"
					,	port : "3003"
					,	protocol : "http"
				}
			,	header:
				{
						"Access-Control-Allow-Origin": "*"
					,	"Access-Control-Allow-Methods": "POST, PUT, GET, DELETE, OPTIONS"
					,	"Access-Control-Max-Age":"0"
					,	"Access-Control-Allow-Headers": "X-Requested-With"
					,	"Content-Type": "text/hal+json; charset=utf-8"
				}
			,	store:
				{
					path: '../lib/store.js'
				}
			,	application:
				{
					user: 'user'
				,	user_login: '/user_login'
				,	user_logout: '/user_logout'
				}
			}
			
	}
if(
	typeof module === 'undefined'
)
	this['Sigma'].portable.ConfigFactory
	=	Factory
else
	module.exports
	=	Factory
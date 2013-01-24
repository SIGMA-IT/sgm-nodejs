var	Factory
=	function()
	{
		return	{
				paths: 
				{
					"sru.api.service": "../../../api/service/"
				,	"lib": "../lib/"
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
					,	"Content-Type": "text/hal+json"
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
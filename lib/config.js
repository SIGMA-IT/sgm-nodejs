var	Factory
=	function()
	{
		return	{
				base : "/api/data"
			,	host : "trabajando"
			,	port : "3003"
			,	protocol : "http"
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
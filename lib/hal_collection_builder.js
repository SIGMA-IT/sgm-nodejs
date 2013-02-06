(
	function(exports)
	{
		exports.make_collection
		=	function(_,hal_builder,uritemplate)
			{
			var	hal_collection_builder
				=	function(collection,options,type_collection)
				{
					var	current_page
					=	options.page||1
					,	ipp
					=	options.ipp||20
					,	url
					=	uritemplate(options.collection_url+'{/id}{?page,ipp}')
					,	last_page
					=	Math.ceil(collection.count/ipp)
					
					var	hal_page
					=	new hal_builder(
								{}
							,	url.expand(
										{	
											page : 	(current_page != 1)
													?	current_page
													:	null
										}
								)
							)
						.embedded(
							{
								'collection' : collection.items
							}
						)

					var	config
					=	{
							url: url
						,	current_page: current_page
						,	ipp: ipp
						,	last_page: last_page
						}

					var	add_links_collection
					= 	{
							pageable: function(hal,config)
							{
							console.log(config)
							var	next_page
							=	1+parseInt(config.current_page)
							,	prev_page
							=	config.current_page-1
							,	next
							=	{next:{href:config.url.expand({page:next_page,'ipp':config.ipp})}}
							,	prev
							=	{prev:{href:config.url.expand({page:prev_page,'ipp':config.ipp})}}

							return	hal
								.link(prev,prev_page>0)
								.link(next,next_page<=config.last_page)
							}
						,	scrollable: function(hal,config)
							{
							var	more_page
							=	1+parseInt(config.current_page)
							,	more
							=	{more:{href:config.url.expand({page:more_page,'ipp':config.ipp})}}
							return	hal.link(more,more_page>0 && more_page<=config.last_page)
							}
						,	list: function(hal,config)
							{
								return	hal
							}
					} 		

					var add_links
					=	type_collection
							?add_links_collection[type_collection]
							:function(hal){return hal}

					return	type_collection
								?add_links(hal_page,config)
								:hal_page
				}
				return hal_collection_builder
			}
	}
)(
	typeof exports === 'undefined'
		?this['Sigma'].portable //ATENTI ACA
		:exports
)
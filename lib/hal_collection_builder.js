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
					=	options.current_page||1
					,	items_per_page
					=	options.items_per_page||20
					,	start
					=	(current_page-1)*items_per_page
					,	end
					=	parseInt(start)+parseInt(items_per_page)
					,	url
					=	uritemplate(options.collection_url+'{/id}{?page,items-per-page}')
					,	last_page
					=	Math.ceil((collection.items.length+items_per_page-1)/items_per_page)
					,	self
					=	{self:{href:url.expand({page:(current_page!=1)?current_page:null})}}
					,	gen_items
					=	function(start,end)
						{
						return	_.map(
								collection.items
							,	function(item,index)
								{
								return	item.resource
											?item
											:new hal_builder(item,url.expand({id:index}))
								}
							).slice(start,end)
						}

					var	hal_page
					=	new hal_builder({},self.self.href)
						//.link({self:{href:url.expand({})}})
						.embedded({'collection':gen_items(start,end)})

					var	config
					=
					{
						url: url
					,	current_page: current_page
					,	items_per_page: items_per_page
					,	last_page: last_page
					}

					var	add_links_collection
					= 
					{
						pageable: function(hal,config)
						{
						var	next_page
						=	1+parseInt(config.current_page)
						,	prev_page
						=	config.current_page-1
						,	next
						=	{next:{href:config.url.expand({page:next_page,'items-per-page':config.items_per_page})}}
						,	prev
						=	{prev:{href:config.url.expand({page:prev_page,'items-per-page':config.items_per_page})}}

						return	hal
							.link(prev,prev_page>0)
							.link(next,next_page<=config.last_page)
						}
					,	scrollable: function(hal,config)
						{
						var	more_page
						=	1+parseInt(config.current_page)
						,	more
						=	{more:{href:config.url.expand({page:more_page,'items-per-page':config.items_per_page})}}
						return	hal.link(more,more_page>0 && more_page<=config.last_page)
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
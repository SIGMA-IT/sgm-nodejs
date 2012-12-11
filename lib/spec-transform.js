(
	function(exports)
	{
		exports.make_transformers
		=	function(_,hal_builder,hal_collection_builder)
			{
			return	function(store,spec,hal)
				{
				var	results={}
					_.each(
						spec
					,	function(source_transform,index)
						{
							var	is_collection
							=	source_transform.collection!=undefined
							,	type_collection
							=	is_collection
									?source_transform.collection.type
									:false
							,	options_collection
							=	is_collection
									?source_transform.collection.options
									:{}

							results[index]
							=	function(what)
								{
								var	json_data
								=	_.clone(what)
								,	transformed
								 =	new hal_builder(json_data,index+'/'+json_data.id)
								var	link_transformers
								=	_.reduce(
										source_transform.links
									,	function(result,field_t,key)
										{
										var	make_links
										=	function(field)
											{
											var	is_single
											=	field.key!=undefined
											,	src
											=	index
											,	src_key
											=	is_single
													?field.key
													:'id'
											,	tgt
											=	field.linked
											,	tgt_key
											=	field.linked_key
											return	function(transform_key)
												{
												var	l
												=	{}
													l[transform_key]
													=	is_single
															?tgt+'/'+what[src_key]
															:tgt
													transformed
													.link(l)
												}
											}
											result[key]=make_links(field_t)
										return	result
										}
									,	{}
									)
								,	embeded_transformers
								=	_.reduce(
										source_transform.embeded
									,	function(result,field_t,key)
										{
										var	make_embeded
										=	function(field)
											{
											var	is_single
											=	field.key!=undefined
											,	src
											=	index
											,	src_key
											=	is_single
													?field.key
													:'id'
											,	tgt
											=	field.embeded
											,	tgt_key
											=	field.embeded_key
											,	embedded_key
											=	is_single
													?field_t.key
													:field_t.embeded
											return	function(transform_key)
												{
												var	embed_single
												=	function()
													{
													return	new hal_builder(store.find(tgt,tgt_key,json_data[src_key]),tgt+'/'+what[src_key])
													}
												,	embed_list
												=	function()
													{

														var items
														=	store.filter(tgt,tgt_key,json_data[src_key])
														.map(
														function(source_item)
														{
															return new hal_builder(source_item, tgt+"/"+source_item.id )
														}
														)
														return is_collection
																	? new hal_collection_builder({items: items},options_collection,type_collection)
																	:items
													}
												,	data
												=	is_single
														?embed_single()
														:embed_list()
												,	to_embed
												=	{}
													to_embed[embedded_key]
													=	data
                                                                                                       //delete transformed.resource[embedded_key]
													transformed.embedded(to_embed)
												}
											}
											result[key]=make_embeded(field_t)
										return	result
										}
									,	{}
									)
									_.each(
										link_transformers
									,	function(t,k)
										{
											t(k)
										}
									)
									_.each(
										embeded_transformers
									,	function(t,k)
										{
											t(k)
										}
									)
								return	transformed.get_document()
								}
						}
					)
				return	results
				}
			}
	}
)(
	typeof exports === 'undefined'
		?this['Sigma'].portable
		:exports
)

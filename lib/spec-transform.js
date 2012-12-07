(
	function(exports)
	{
		exports.make_transformers
		=	function(_,hal_builder)
			{
			return	function(store,spec,hal)
				{

				var	results={}
					_.each(
						spec
					,	function(source_transform,index)
						{
							results[index]
							=	function(what)
								{
								var	json_data
								=	_.clone(what)
								 ,	transformed
								 =	new hal_builder(json_data,index+'/'+json_data.id)

								var	transformers
								=	_.reduce(
										source_transform
									,	function(result,field_t,key)
										{
										var	make_transformer
										=	function(field)
											{
											var	is_single
											=	field.key!=undefined
											,	is_linked
											=	field.linked!=undefined
											,	src
											=	index
											,	src_key
											=	is_single
													?field.key
													:'id'
											,	tgt
											=	is_linked
													?field.linked
													:field.embeded
											,	tgt_key
											=	is_linked
													?field.linked_key
													:field.embeded_key
											,	embedded_key
											=	is_single
													?field_t.key
													:field_t.embeded

											return	function(source_item,transform_key)
												{
												var	embed_single
												=	function(embedded_link)
													{
													return new hal_builder(store.find(tgt,tgt_key,json_data[src_key]), embedded_link)
													}
												,	embed_list
												=	function(embedded_link)
													{
													return store.filter(tgt,tgt_key,json_data[src_key])
														.map(
														function(source_item)
														{
															return new hal_builder(source_item, embedded_link+"/"+source_item.id )
														}
														)
													}
												,	link_single
												=	function()
													{
													return	tgt+'/'+what[src_key]
													}
												,	link_list
												=	function()
													{
													return	tgt
													}

													var	embedded_link
													=	is_single
															?link_single()
															:link_list()
													,	data
													=	is_single
															?embed_single(embedded_link)
															:embed_list(embedded_link)
													,	to_embed
													=	{}
														to_embed[embedded_key]
													=	data

													delete source_item.resource[embedded_key]
													source_item.embedded(to_embed)
												}
											}
											result[key]=make_transformer(field_t)
										return	result
										}
									,	{}
									)
									_.each(
										transformers
									,	function(t,k)
										{
											t(transformed,k)
										}
									)
								console.log(transformed.get_document())
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

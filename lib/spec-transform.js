(
	function(exports)
	{
		exports.make_transformers
		=	function(_,hal_builder,hal_collection_builder,uritemplate)
			{
			return	function(store,spec,hal)
				{
				return	_.reduce(
						_(spec)
						.map(
							function(transform_spec,transform_entry)
							{
							//console.log(transform_entry,transform_spec)
							return	_(transform_spec)
								.defaults(
									{
										storage:
											{
												name:transform_entry
											}
									}
								)
							}
						).map(
							function(transform_spec,transform_entry)
							{
							//console.log(transform_entry,transform_spec)
							return	_(transform_spec)
								.defaults(
									{
										api:
											{
												uri:'/'+transform_spec.storage.name
											}
									}
								)
							}
						)
					,	function(results,transform_spec,transform_entry)
						{
						//console.log(transform_entry,transform_spec)
						var	storage
						=	transform_spec.storage
						,	api
						=	transform_spec.api
						,	associations
						=	transform_spec.associations
						var	is_collection
						=	transform_spec.collection!=undefined
						,	type_collection
						=	is_collection
								?transform_spec.collection.type
								:false
						,	options_collection
						=	is_collection
								?transform_spec.collection.options
								:{}
							results[storage.name]
							=	function(what)
								{
								var	json_data
								=	_.clone(what)
								,	src_url
								=	uritemplate('{+uri}{/id}')
									.expand(
										{
											uri:api.uri
										,	id:json_data.id
										}
									)
								,	transformed
								 =	new hal_builder(json_data,src_url)
								var	transformers
								=	_.reduce(
										associations
									,	function(result,assoc_spec,assoc_key)
										{
											result[assoc_key]
											=(
												(
													{
														'has-many':
															function(a_spec)
															{
																var	tgt
																=	a_spec.target
																,	tgt_key
																=	a_spec.target_key
																return	function(transform_key)
																	{
																	var	stored_items
																	=	store
																		.filter(tgt,tgt_key,json_data['id'])
																	,	tgt_url
																	=	uritemplate('{+src_url}/{+target}')
																		.expand(
																			{
																				src_url:src_url
																			,	target:tgt
																			}
																		)
																		transformed
																		.link(
																			_.object(
																				[transform_key]
																			,	[tgt_url]
																			)
																		)
																		if( a_spec.embeded )
																			(
																				function(items)
																				{
																					a_spec
																					.embeded
																					.options
																					.collection_url=tgt_url
																					transformed
																					.embedded(
																						_.object(
																							[transform_key]
																						,	[
																								(a_spec.embeded.type=='collection')
																								?new hal_collection_builder(
																										{
																											items: items
																										}
																									,	a_spec.embeded.options
																									,	a_spec.embeded.options.type
																									)
																								:items
																							]
																						)
																					)
																				}
																			)(
																				stored_items
																				.map(
																					function(source_item)
																					{
																					return new hal_builder(source_item, tgt_url )
																					}
																				)
																			)
																	}
															}
													,	'has-one':
															function()
															{
															}
													,	'belongs-to':
															function()
															{
															}
													}
												)[assoc_spec.type]
											)(assoc_spec)
										return	result
										}
									,	{}
									)
								var	link_transformers
								=	_.reduce(
										transform_spec.links
									,	function(result,field_t,key)
										{
										var	make_links
										=	function(field)
											{
											var	is_single
											=	field.key!=undefined
											,	src
											=	storage.name
											,	src_key
											=	is_single
													?field.key
													:'id'
											,	tgt
											=	field.target
											,	tgt_key
											=	field.target_key
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
										transform_spec.embeded
									,	function(result,field_t,key)
										{
										var	make_embeded
										=	function(field)
											{
											var	is_single
											=	field.key!=undefined
											,	src
											=	storage.name
											,	src_key
											=	is_single
													?field.key
													:'id'
											,	tgt
											=	field.target
											,	tgt_key
											=	field.target_key
											,	embedded_key
											=	key
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
													transformed.embedded(to_embed)
												}
											}
											result[key]=make_embeded(field_t)
										return	result
										}
									,	{}
									)
									_.each(
										transformers
									,	function(t,k)
										{
											if(t) t(k)
										}
									)
								return	transformed.get_document()
								}
						return	results
						}
					,	{}
					)
				}
			}
	}
)(
	typeof exports === 'undefined'
		?this['Sigma'].portable
		:exports
)

(
	function(exports)
	{
		exports.make_transformers
		=	function(_,hal,hal_builder,hal_collection_builder,uritemplate)
			{
			return	function(store,spec)
				{
					_(spec)
					.each(
						function(transform_spec,transform_entry)
						{
							_(transform_spec.associations)
							.each(
								function(association)
								{
									if( _.isString(association.target) )
									{
										if(!_.isObject(spec[association.target]))
											throw 'ERROR: '+association.target+' invalid addociation'
										spec[association.target].name=association.target
										association.target=spec[association.target]
									}
								}
							)
						//console.log(transform_entry,transform_spec)
						}
					)
				return	_.reduce(
						spec
					,	function(results,transform_spec,transform_entry)
						{
						console.log(transform_entry,transform_spec)
						var	storage
						=	transform_spec.storage
						,	api
						=	transform_spec.api
						,	associations
						=	transform_spec.associations
							results[transform_entry]
							=	function(what)
								{
								var	json_data
								=	_.clone(what)
								,	src_url
								=	uritemplate(api.templates.find_one)
									.expand(
										_(api.url)
										.extend(
											{
												id:	json_data.id
											}
										)
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
																var	target
																=	a_spec.target
																var	tgt
																=	target.name
																,	tgt_key
																=	a_spec.target_key
																return	function(transform_key)
																	{
																	var	stored_items
																	=	store
																		.filter(tgt,tgt_key,json_data['id'])
																	,	tgt_url
																	=	uritemplate(target.api.templates.filter)
																		.expand(
																			{
																				base:src_url
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
																					transformed
																					.embedded(
																						_.object(
																							[transform_key]
																						,	[
																								(
																									{
																										collection:
																											function(i)
																											{
																												a_spec
																												.embeded
																												.options
																												.collection_url=tgt_url
																											return	new hal_collection_builder(
																													{
																														items: i
																													}
																												,	a_spec.embeded.options
																												,	a_spec.embeded.options.type
																												)
																											}
																									,	list: _.identity
																									}
																								)[ a_spec.embeded.type ](items)
																							]
																						)
																					)
																				}
																			)(
																				stored_items
																				.map(
																					function(source_item)
																					{
																					return new hal_builder(
																							source_item
																						,	uritemplate(target.api.templates.find_one)
																							.expand(
																								_(target.api.url)
																								.extend(
																									{
																										id:	source_item.id
																									}
																								)
																							)
																						)
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

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
							_(transform_spec.api)
							.extend(
								{
									get_url:
										function(data)
										{
										return	uritemplate(this.templates.find_one)
											.expand(
												_(this.url)
												.extend(
													data
												)
											)
										}
								,	get_url_filter:
										function(base)
										{
										return	uritemplate(this.templates.filter)
											.expand(
												{
													base:base
												}
											)
										}
								}
							)
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
									if( _.isString(association.embeded) )
										association.embeded={type:association.embeded}
								}
							)
						//console.log(transform_entry,transform_spec)
						}
					)
				return	_.reduce(
						spec
					,	function(results,transform_spec,transform_entry)
						{
						//console.log(transform_entry,transform_spec)
						var	storage
						=	transform_spec.storage
						,	api
						=	transform_spec.api
						,	associations
						=	transform_spec.associations
							results[transform_entry]
							=	function(source_data)
								{
								var	transformed
								 =	new hal_builder(source_data,api.get_url(source_data))
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
																,	tgt
																=	target.name
																,	tgt_key
																=	a_spec.target_key
																return	function(transform_key)
																	{
																	var	stored_items
																	=	store
																		.filter(tgt,tgt_key,source_data['id'])
																	,	tgt_url
																	=	target.api.get_url_filter(api.get_url(source_data))
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
																						,	target.api.get_url(source_item)
																						)
																					}
																				)
																			)
																	}
															}
													,	'has-one':
															function(a_spec)
															{
																var	target
																=	a_spec.target
																,	tgt
																=	target.name
																,	src_key
																=	a_spec.key
																,	tgt_key
																=	a_spec.target_key||'id'
																return	function(transform_key)
																	{
																	var	stored_item
																	=	store
																		.find(tgt,tgt_key,source_data[src_key])
																	,	tgt_url
																	=	target.api.get_url(stored_item)
																		transformed
																		.link(
																			_.object(
																				[transform_key]
																			,	[tgt_url]
																			)
																		)
																		if( a_spec.embeded )
																			(
																				function(item)
																				{
																					transformed
																					.embedded(
																						_.object(
																							[transform_key]
																						,	[
																								(
																									{
																										single: _.identity
																									,	full: _.identity
																									,	partial: _.identity
																									}
																								)[ a_spec.embeded.type ](item)
																							]
																						)
																					)
																				}
																			)(
																				new hal_builder(
																					stored_item
																				,	target.api.get_url(stored_item)
																				)
																			)
																	}
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

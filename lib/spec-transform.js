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
								}
							)
							_(transform_spec.associations)
							.each(
								function(association,assoc_key)
								{
									association.source=transform_spec
									if(!_.isObject(spec[association['target']]))
										throw 'ERROR: '+association['target']+" invalid 'target' in '"+ assoc_key  +"' association"
									_(['target','through'])
									.each(
										function(what)
										{
											if( _.isString(association[what]) )
											{
												spec[association[what]].name=association[what]
												association[what]=spec[association[what]]
											}
										}
									)
									if( _.isString(association.embeded) )
										association.embeded={type:association.embeded}
									if(association.template)
										_(association)
										.extend(
											{
												get_link:
													function(data)
													{
													return	uritemplate(this.template)
														.expand(
															_(transform_spec.api.url)
															.extend(
																data
															)
														)
													}
											}
										)
								}
							)
						//console.log(transform_entry,transform_spec)
						}
					)
				function check_spec(spec)
				{
				var	visited
				=	[]
				var	_check
				=	function(t_spec)
					{
						visited.push(t_spec.name)
					var	all_ok
					=	_(t_spec.associations)
						.every(
							function(assoc,assoc_key)
							{
								if(	(!assoc.embeded)
								||	(assoc.embeded.type=='partial')
								)	return	true
								if(!_(visited).contains(assoc.target.name))
								return	_check(assoc.target)
								else
								{
									console.log(
										'referecia circular'
									,	{
											assoc:assoc_key
										,	source:assoc.source.name
										,	target:assoc.target.name
										}
									)
									return	false
								}
							}
						)
						visited.pop()
					return	all_ok
					}
				return	_(spec)
					.every(_check)
				}
				if(!check_spec(spec)) throw 'FATAL: errores en la spec'

				var	spec_transformers
				=	_.reduce(
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
							=	function(source_data,profile)
								{
								var	transformed
								=	new hal_builder(source_data,api.get_url(source_data))
								,	associations2
								=	(profile!='partial')
										?associations
										:_(associations)
										.reduce(
											function(result,assoc,assoc_key)
											{
												result[assoc_key]
												=	_.omit(assoc,'embeded')
											return	result
											}
										,	{}
										)
								var	transformers
								=	_.each(
										associations2
									,	function(assoc_spec,assoc_key)
										{
											;(
												(
													{
														'has-many':
															function(a_spec)
															{
																var	get_target_data
																=	function(src_assoc,src_data)
																	{
																	var	tgt
																	=	src_assoc.target.name
																	,	src_key
																	=	src_assoc.key||'id'
																	,	belonging_to
																	=	function(src_spec,tgt_spec)
																		{
																			//TODO: manejar casos de multiples belongs-to same target
																			//desambiguar via roles o bien requerir especificar target_key
																		var	found
																		=	_(tgt_spec.associations)
																			.find(
																				function(assoc)
																				{
																				return	assoc.type=="belongs-to"
																					&&	assoc.target.name==src_spec.name
																				}
																			)
																		if(!found)
																		{
																			console.log([src_assoc,tgt_spec])
																			throw  ('Fatal: '+src_spec.name)
																		}
																		return	found.key
																		}
																	,	belonging_to_through
																	=	function(assoc)
																		{
																		return	{
																				through:belonging_to(assoc.source,assoc.through)
																			,	target:belonging_to(assoc.target,assoc.through)
																			}
																		}
																	return	src_assoc.through
																			?(
																				function()
																				{
																				var	keys
																				=	belonging_to_through(src_assoc)
																				return	_(
																						store.filter(src_assoc.through.name,keys.through,src_data['id'])
																					)
																					.map(
																						function(relation_data)
																						{
																						return	store.find(src_assoc.target.name,'id',relation_data[keys.target])
																						}
																					)
																				}
																			)()
																			:(
																				function()
																				{
																				var	tgt_key
																				=	src_assoc.target_key
																				||	belonging_to(src_assoc.source,src_assoc.target)																				||	src_assoc.target_key
																				return	store.filter(tgt,tgt_key,src_data[src_key])
																				}
																			)()
																	}
																return	function(transform_key)
																	{
																	var	stored_items
																	=	get_target_data(a_spec,source_data)
																	,	tgt_url
																	=	a_spec.get_link(source_data)
																		transformed
																		.link(
																			_.object(
																				[transform_key]
																			,	[tgt_url]
																			)
																		)
																		if( a_spec.embeded)
																		{
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
																				return	spec_transformers[a_spec.target.name](source_item,'partial')//a_spec.embeded.type)
																				}
																			)
																		)
																		}
																	}
															}
													,	'belongs-to':
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
																		if( a_spec.embeded)
																		{
																			(
																				function(item)
																				{
																					transformed
																					.embedded(
																						_.object(
																							[transform_key]
																						,	[item]
																						)
																					)
																				}
																			)(
																				spec_transformers[target.name](stored_item,a_spec.embeded.type)
																			)
																		}
																	}
															}
													,	'has-one':
															function()
															{
															}
													}
												)[assoc_spec.type]
											)(assoc_spec)(assoc_key)
										}
									)
								return	transformed//.get_document()
								}
						return	results
						}
					,	{}
					)
				return	spec_transformers
				}
			}
	}
)(
	typeof exports === 'undefined'
		?this['Sigma'].portable
		:exports
)

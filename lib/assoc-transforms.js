(
	function(exports)
	{
		exports.make_assoc_transformer
		=	function(_,hal_collection_builder)
			{
			return	function(assoc,store,transformers)
				{
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
					if(!check_spec(transformers)) throw 'FATAL: errores en la spec'
				var	make_belongs_to
				=	function(store,transformers)
					{
					return	function(a_spec)
							{
								var	target
								=	a_spec.target
								,	tgt
								=	target.name
								,	src_key
								=	a_spec.key
								,	tgt_key
								=	a_spec.target_key||'id'
								return	function(data,builder)
									{
										store
										.find(
											tgt
										,	tgt_key
										,	data[src_key]
										,	function(stored_item)
											{
											var	tgt_url
											=	target.api.get_url(stored_item)
												builder
												.link(
													_.object(
														[a_spec.name]
													,	[tgt_url]
													)
												)
												if( a_spec.embeded)
												{
													(
														function(item)
														{
															builder
															.embedded(
																_.object(
																	[a_spec.name]
																,	[item]
																)
															)
														}
													)(
														transformers[target.name](stored_item,a_spec.embeded.type)
													)
												}
											}
										)
									}
							}
					}
				var	make_has_many
				=	function(store,transformers)
					{
					return	function(a_spec)
							{
								var	get_target_data
								=	function(src_assoc,src_data,callback)
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
													store.filter_through(
														src_assoc.target.name
													,	'id'
													,	src_assoc.through.name
													,	keys.through
													,	src_data['id']
													,	callback
													)
												}
											)()
											:(
												function()
												{
												var	tgt_key
												=	src_assoc.target_key
												||	belonging_to(src_assoc.source,src_assoc.target)																				||	src_assoc.target_key
												return	store.filter(
														tgt
													,	tgt_key
													,	src_data[src_key]
													,	callback
													)
												}
											)()
									}
								return	function(data,builder)
									{
									var	tgt_url
									=	a_spec.get_link(data)
										builder
										.link(
											_.object(
												[a_spec.name]
											,	[tgt_url]
											)
										)
										if( a_spec.embeded)
											get_target_data(
												a_spec
											,	data
											,	function(stored_items)
												{
												(
													function(items)
													{
														builder
														.embedded(
															_.object(
																[a_spec.name]
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
														return	transformers[a_spec.target.name](source_item,'partial')//a_spec.embeded.type)
														}
													)
												)
												}
											)
									}
							}
					}
				return	(
						{
							'has-many': make_has_many(store,transformers)
						,	'belongs-to':make_belongs_to(store,transformers)
						}
					)[assoc]
				}
			}
	}
)(
	typeof exports === 'undefined'
		?this['Sigma'].portable
		:exports
)


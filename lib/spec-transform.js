(
	function(exports)
	{
		exports.make_transformers
		=	function(_,hal,hal_builder,hal_collection_builder,uritemplate,assoc_transforms)
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
										throw "ERROR: '"+transform_entry+"': invalid 'target' in '"+ assoc_key  +"' association"
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
								var	associations2
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
								,	transform_one
								=	function(data)
									{
									var	result
									=	new hal_builder(data,api.get_url(data))
										_.each(
											associations2
										,	function(assoc_spec,assoc_key)
											{
												assoc_spec.name=assoc_key
												assoc_transforms(assoc_spec.type,store,spec_transformers)
												(assoc_spec)
												(data,result)
											}
										)
									return	result
									}
								,	transform_many
								=	function(data)
									{
									var	result
									=	new hal_builder({},api.get_url({}))
										store.filter(
											transform_entry
										,	{}
										,	function(items)
											{
												result.embedded(
													_.map(
														items
													,	transform_one
													)
												)
											}
										)
									return	result
									}
								return	source_data
										?transform_one(source_data)
										:transform_many()
								}
						return	results
						}
					,	{}
					)
				return	{
						transformers:spec_transformers
					,	route:
							function(parsed_url,profile)
							{
							var	cb
							=	_.last(arguments)
							,	base
							=	'/api/data'
							,	base_parts
							=	parsed_url.path.match(RegExp('^'+base+'(.*)$'))
							,	parts
							=	base_parts
									?base_parts[1].match(/^(?:\/([^\/]+))?(?:\/([^\/]+))?(?:\/([^\/]+))?\/?$/)
									:false
								//console.log('url: ',parseUri(req.url))
								if(parts)
								{
								var	collection
								=	parts[1]
								,	transformer
								=	spec_transformers[collection]
									if(transformer)
									{
									var	item_id
									=	parts[2]
									,	subcollection
									=	parts[3]
										if(transformer&&!subcollection)
										{
											store.find(
												collection
											,	{key:'id',id:item_id}
											,	function(item)
												{
													cb(
														transformer(item).get_document()
													)
												}
											)
										}else{
											store.find(
												collection
											,	{key:'id',id:item_id}
											,	function(item)
												{
													cb(
														transformer(item).get_document()
													)
												}
											)
										}
									}
									else
										cb(404)
								}
								else
									cb(404)
							}
					}
				}
			}
	}
)(
	typeof exports === 'undefined'
		?this['Sigma'].portable
		:exports
)

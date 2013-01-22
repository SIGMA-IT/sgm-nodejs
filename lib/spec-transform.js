var	Factory
=	function(
		_
	,	hal
	,	hal_builder
	,	hal_collection_builder
	,	uritemplate
	,	parseUri
	,	AssocTransfoms
	,	Q
	)
	{
	return	function(store,spec)
		{
			this.store
			=	store
			this.spec
			=	spec
				_(this.spec)
				.each(
					function(transform_spec,transform_entry)
					{
						_(transform_spec.api)
						.extend(
							{
								get_url:
									function(data)
									{
									console.log("GET URL")
									return	uritemplate(this.templates.find_one)
										.expand(
											_.extend(
												{}
											,	this.url
											,	data
											)
										)
									}
							}
						)
						_(transform_spec.associations)
						.each(
							function(association,assoc_key)
							{
								//ATENTI!!! PARCHE ROÑOSOOOO
								association.name=assoc_key
								if(	association.type=="has-many"
								)	association.template="{protocol}://{host}:{port}{+base}{/path,id}/"+association.name
								//ATENTI!!! PARCHE ROÑOSOOOO
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
														_.extend(
															{}
														,	transform_spec.api.url
														,	data
														)
													)
												}
										}
									)
							}
						)
					}
				)
			var	assoc_transforms
			=	new AssocTransfoms(store,spec)
			this.get_router
			=	function()
				{
				var	store
				=	this.store
				,	spec
				=	this.spec
				var	spec_store
				=	_.objMap(
						spec
					,	function(transform_spec,transform_entry)
						{
						var	api
						=	transform_spec.api
						,	associations
						=	transform_spec.associations
						return	function(params)
							{
								return	(params.id && !params.subcollection)
										?	store.find(
												params.collection
											,	_.extend(
													{
														key:'id'
													,	id:params.id
													}
													,	params.query
												)
											)
										:	(params.id && params.subcollection)
											?	store.filter(
													transform_entry
												,	_.extend(
														assoc_transforms
														.get_filter_related(
															params.collection
														,	params.subcollection
														,	params
														)
														,	params.query
													)
												)
											:	store.filter(
													params.collection
												,	{}
												)
							}
						}
					)
				var	spec_builders
				=	_.objMap(
						spec
					,	function(transform_spec,transform_entry)
						{
						var	api
						=	transform_spec.api
						,	associations
						=	transform_spec.associations
						,	profiles
						=	transform_spec.profiles
						
						return	function(data,profile,assoc)
							{
							var get_profile
							=	function(assoc_key)
								{
									return false
								}
							var recursive_reduce_list
							=	function(more,list,iteration,callback)
								{
									async_resolve_url(iteration.url,iteration.rel)
									.then(
										function(result)
										{
											more[iteration.rel] = result
											if (list.length > 0)
												recursive_reduce_list(
													more
												,	_.initial(list)
												,	list.pop()
												,	callback
												)
											else
												callback(more)
										}
									)
								}
							,	async_resolve_url
							=	function(url,assoc_key)
								{
									var	deferred
									=	Q.defer()

									Q.spread(
										[
											router(
												url
											,	get_profile(assoc_key)
											)
										]
									,	function(result)
										{
											deferred
												.resolve(
													result
												)
										}
									)

									return deferred.promise
								}
							,	async_get_links
							=	function(item)
								{
									var deferred
									=	Q.defer()

									deferred
										.resolve(
											_(associations)
												.objMap(
													function(assoc_spec,assoc_key)
													{	
														return	_.isObject(assoc_spec.linked)
																?	assoc_transforms.get_url(assoc_spec,item)
																:	assoc_transforms.get_url(assoc_spec,item)
													}
												)
										)

									return deferred.promise
								}
							,	async_get_embedded
							=	function(item)
								{
									var deferred
									=	Q.defer()

									async_get_links(item)
									.then(
										function(links)
										{
											var	list
											=	new Array()

											for (var attr in links)
													list
														.push(
															{
																rel: attr
															,	url: links[attr]	
															}
														)

											recursive_reduce_list(
												{}
											,	_.initial(list)
											,	list.pop()
											,	function(result)
												{
													deferred
														.resolve(
															result
														)
												}
											)
										}
									)

									return deferred.promise
								}
							,	async_build_one
							=	function(item)
								{
									var	deferred
									=	Q.defer()

									var	hal_result
									=	new hal_builder(
											item
										,	api.get_url({})
										)

									deferred
										.resolve(
											Q.spread(
												[
													async_get_links(item)
												,	async_get_embedded(item)
												]
											,	function (links, embeddeds)
												{
		        									return	hal_result
			        											.link(
			        												_.object(
			        													_.keys(links)
			        												,	_.values(links)
			        												)
			        											)
			        											.embedded(
			        												_.object(
			        													_.keys(embeddeds)
			        												,	_.values(embeddeds)
			        												)
			        											)
		    									}
		    								)
										)

									return deferred.promise
								}
							,	async_build_many
							=	function(items)
								{
									var	deferred
									=	Q.defer()

									deferred
										.resolve(
											new hal_collection_builder(
													{
														items: items
													}
												,	{
														collection_url: api.get_url({})
													}
												,	'pageable'
											)
										)

									return deferred.promise
								}

							var deferred = Q.defer()

							_(data).isArray()
								?	deferred.resolve(
										async_build_many(
											data
										)
									)
								:	deferred.resolve(
										async_build_one(
											data
										)
									)

							return deferred.promise
							}
						}
					)
				var	router
				=	function(url,profile)
					{
					console.log("router.profile",url,profile)
					var	parsed_original
					=	parseUri(url)
					,	parsed_url
					=	parsed_original.path
					,	collection_params
					=	{
							type:parsed_original.queryKey['type']||undefined
						,	page:parseInt(parsed_original.queryKey['page'])||1
						,	ipp:parseInt(parsed_original.queryKey['ipp'])||10
						}
					,	base
					=	'/api/data'
					,	base_parts
					=	parsed_url.match(RegExp('^'+base+'(.*)$'))
					,	parts
					=	base_parts
							?base_parts[1].match(/^(?:\/([^\/]+))?(?:\/([^\/]+))?(?:\/([^\/]+))?\/?$/)
							:{}
					,	deferred
					=	Q.defer()
					,	parsed
					=	{
							collection:parts[1]
						,	id:parts[2]
						,	subcollection:parts[3]
						,	query:collection_params
						}
					if(parts)
					{
						var	item
						=	parsed.subcollection
								?spec[parsed.collection]
									.associations[parsed.subcollection]
									.target.name
								:parsed.collection
						,	assoc
						=	parsed.subcollection
								?	spec[parsed.collection]
										.associations[parsed.subcollection]
								:	false
						,	query
						=	spec_store[item]
						,	builder
						=	spec_builders[item]
						deferred
							.resolve(
								builder(
									query(parsed)
								,	profile
								,	assoc
								)
							)
					} else
						deferred
							.resolve(
								function()
								{
									return 404
								}
							)

					return	deferred.promise
					}
				return	router
				}
		}
	}
if(
	typeof module === 'undefined'
)
	this['Sigma'].portable.SpecTransformsFactory
	=	Factory
else
	module.exports
	=	Factory

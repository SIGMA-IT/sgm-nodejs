var	Factory
=	function(
		_
	,	Q
	,	hal_builder
	,	hal_collection_builder
	,	parseUri
	,	logger
	)
	{
	return	function(spec,assoc_transforms,REST,server_config)
		{
			this.visited
			=	new Array()
			this.register_url
			=	function(spec_key,assoc_key,item)
				{
					var	assoc
					=	spec[spec_key].associations[assoc_key]

					this
						.visited
							.push(
								{
									from: spec_key
								,	to: assoc.target
								,	rel: assoc.type
								,	url: assoc.get_resource_url(item)
								,	item: item
								}
							)
				}
			this.check_url
			=	function(spec_key,assoc_key,item)
				{
					var	assoc
					=	spec[spec_key].associations[assoc_key]
					,	inverse

					return	!_.isUndefined(
								_.find(
									this.visited
								,	function(visited_resource)
									{
										inverse
										=	assoc_transforms.get_inverse(assoc,visited_resource.item)
										return	(
													visited_resource.from	==	inverse.to
												&&	visited_resource.to		==	inverse.from
												&&	visited_resource.rel	==	inverse.rel
												&&	visited_resource.url	==	inverse.url
												)
												||
												(
													visited_resource.url	==	assoc.get_resource_url(item)
												)
									}
								)
							)
				}
			this.clear_register
			=	function()
				{
					this.visited 
					=	new Array()
				}
			//	WHAT (ENTITY) - PARAMS (type,msg,code)
			this.resolve_embedded
			=	function(link)
				{	
					var deferred
					=	Q.defer()
					this
						.router(
							'GET'
						,	_.last(
								_.values(link)
							)
						,	{}
						)
						.then(
							function(result)
							{
								deferred
									.resolve(
										result
									)
							}
						)

					return deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (type,msg,code)
			this.resolve_linked_nested
			=	function(assoc,embedded_type,assoc_generic_link,item)
				{
					var	deferred
					=	Q.defer()

					this.resolve_embedded(assoc_generic_link)
					.then(
						function(resolved_embeddeds)
						{
							var links
							=	_.object(
									_.keys(assoc_generic_link)
								,	[
									_.map(
										resolved_embeddeds.resource._embedded.collection
									,	function(item)
										{
											return	assoc.get_linked(item)
										}
									)
									]
								)
							deferred
								.resolve(
									_.object(
										(embedded_type == "none")
										?	['links']
										:	['links','embeddeds']
									,	(embedded_type == "none")
										?	[links]
										:	[links
											,	_.object(
													_.keys(assoc_generic_link)
												,	[resolved_embeddeds]
												)
											]
									)
								)
						}
					)

					return deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (type,msg,code)
			this.resolve_linked_single
			=	function(assoc,embedded_type,assoc_generic_link,item)
				{
					var	deferred
					=	Q.defer()

					this.resolve_embedded(assoc_generic_link)
					.then(
						function(resolved_embeddeds)
						{
							var links
							=	_.reduce(
									_.map(
										resolved_embeddeds.resource._embedded.collection
									,	function(item)
										{	
											return	_.object(
													[assoc.get_linked_rel(item)]
												,	[assoc.get_linked(item)]
												)
										}
									)
								,	function(memo,link)
									{
										return _.extend(
												memo
											,	link
											)
									}	
								,	{}
								)

							deferred
								.resolve(
									_.object(
										(embedded_type == "none")
										?	['links']
										:	['links','embeddeds']
									,	(embedded_type == "none")
										?	[links]
										:	[
												links
											,	_.object(
													_.keys(assoc_generic_link)
												,	[resolved_embeddeds]
												)
											]
									)
								)
						}
					)

					return deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (type,msg,code)
			this.resolve_linked_none
			=	function(assoc,embedded_type,assoc_generic_link,item)
				{
					var	deferred
					=	Q.defer()

					if (embedded_type != "none" )
						this.resolve_embedded(assoc_generic_link)
						.then(
							function(resolved_embeddeds)
							{
								deferred
									.resolve(
										{
											links:	assoc_generic_link
										,	embeddeds:	_.object(
															_.keys(assoc_generic_link)
														,	[resolved_embeddeds]
														)
										}
									)
							}
						)
					else
							deferred
								.resolve(
									{
										links: assoc_generic_link
									}
								)

					return	deferred.promise
				}
			this.resolve_joined
			=	function(toJoin)
				{
					var	self
					=	this
					,	joined
					=	{links:{},embeddeds:{}}
					,	deferred
					=	Q.defer()

					Q.all(
						_.map(
							_.values(toJoin)
						,	function(promised,key)
							{
								return	self.build(_.keys(toJoin)[key],Q(promised))
							}
						)
					).then(
						function(resources_toJoin)
						{
							_.each(
								resources_toJoin
							,	function(resolved,key)
								{
									resolved.resource._links.self.rel = _.keys(toJoin)[key]
									_.extend(
										joined.links
									,	_.object(
											[_.keys(toJoin)[key]]
										,	[resolved.resource._links.self.href]
										)
									)
									_.extend(
										joined.embeddeds
									,	_.object(
											[_.keys(toJoin)[key]]
										,	[resolved]
										)
									)
								}
							)
							deferred
								.resolve(
									joined
								)
						}
					)

					return deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (assoc_key,item)
			this.resolve_assoc
			=	function(what,params)
				{
					var deferred
					=	Q.defer()
					,	link_function
					=	'resolve_linked_'+spec[what].associations[params.assoc_key].linked.type
					,	resource_url
					=	spec[what].associations[params.assoc_key].get_resource_url(params.item)
					,	embedded_type
					=	spec[what].associations[params.assoc_key].embedded.type
					
					if	(
							embedded_type != "none"
						&&	(spec[what].associations[params.assoc_key].type.split(":").length == 1)
						&&	this.check_url(what,params.assoc_key,params.item)
						)
					{
						embedded_type = "none"
						logger.notice("Avoided Circular Reference in <<"+what+">>:<<"+params.assoc_key+">>")
					}
					else
						if (embedded_type != "none")
							this.register_url(what,params.assoc_key,params.item)

					this[link_function](
						spec[what].associations[params.assoc_key]
					,	embedded_type
					,	_.object(
							[params.assoc_key]
						,	[resource_url]
						)
					,	params.item
					)
					.then(
						function(resolved)
						{
							deferred
								.resolve(
									resolved	
								)
						}
					)

					return deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (item,toJoin)
			this.build_one
			=	function(what,params)
				{
					var	deferred
					=	Q.defer()
					,	self
					=	this
					,	hal_result
					=	new hal_builder(
							params.item
						,	spec[what].api.get_resource_url(params.item)
						)

					if (_.isEmpty(spec[what].associations)) 
						deferred
							.resolve(
								hal_result
							)
					else
						Q.all(
							_.map(
								spec[what].associations
							,	function(assoc,assoc_key)
								{
									return	self
												.resolve_assoc(
													what
												,	{
														assoc_key: assoc_key
													,	item: params.item
													}
												)
								}
							)
						).then(
							function(resolved)
							{
								self.resolve_joined(params.toJoin)
								.then(
									function(resolved_join)
									{
										_.each(
											_.union(
												resolved
											,	resolved_join
											)
										,	function(resolved_assoc)
											{
												hal_result
													.link(
														resolved_assoc.links
													)
													.embedded(
														resolved_assoc.embeddeds
													)
											}
										)
										deferred
											.resolve(
												hal_result
											)
									}
								)
							}
						)

					return	deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (items,count,collection_url,collection_query)
			this.build_many
			=	function(what,params)
				{
					var	deferred
					=	Q.defer()
					,	self
					=	this

					Q.all(
						_.map(
							params.items
						,	function(item)
							{
								return	self
											.build_one(
												what
											,	{
													item: item
												,	toJoin: undefined
												}
											)
							}
						)
					)
					.then(
						function(resolved_items)
						{
							deferred
								.resolve(
									new hal_collection_builder(
											{
												items:resolved_items
											,	count:params.count
											}
										,	_.extend(
												{
													collection_url:	_.isUndefined(params.collection_url)
																	?	spec[what].api.get_resource_url()
																	:	params.collection_url
												}
											,	spec[what].collection
											,	params.collection_query
											)
										,	_.has(params.collection_query, "type") 
											?	params.collection_query.type
											: 	spec[what].collection.type
									)
								)
						}
					)

					return deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (type,msg,code)
			this.build_msg
			=	function(what,params)
				{
					var deferred
					=	Q.defer()

					deferred
						.resolve(
							new hal_builder(
								{
									type: params.type
								,	msg: params.msg
								,	code: params.code
								}
							,	spec[what]
									.api
										.get_msg(
											{
												code: params.code
											}
										)
							)
						)

					return deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS - COLLECTION_QUERY - COLLECTION_URL
			this.build
			=	function(what,promised_data,collection_query,collection_url)
				{
					var	deferred 
					=	Q.defer()
					,	self
					=	this

					promised_data
					.then(
						function(resolved_data)
						{
							if (_.isUndefined(resolved_data.items))
								deferred
									.resolve(
										self.build_msg(
												what
											,	resolved_data
											)
									)
							else
								resolved_data.items
								.then(
									function(items)
									{
										resolved_data.count
										.then(
											function(count)
											{
												deferred
													.resolve(
														_.isUndefined(items) || _.isEmpty(items)
														?	self.build_msg(
																what
															,	{
																	type:	'ERROR'
																,	msg:	'Resource Not Found'
																,	code:	404
																}
															)
														:	_.isArray(items)
															?	self
																	.build_many(
																		what
																	,	{
																			items: items
																		,	count: count
																		,	collection_query: collection_query
																		,	collection_url: collection_url
																		}
																	)
															:	self
																	.build_one(
																		what
																	,	{
																			item: items
																		,	toJoin: resolved_data.join
																		}
																	)
													)
											}
										)
									}
								)
						}
					)

					return deferred.promise
				}
			this.router
			=	function(method,url,body)
				{
					var	deferred
					=	Q.defer()
					,	parsed_url
					=	parseUri(url)
					,	valid_url
					=	parsed_url.path.match(RegExp('^'+server_config.base+'(.*)$'))[1]
					,	parts
					=	valid_url.match(/^(?:\/([^\/]+))?(?:\/([^\/]+))?(?:\/([^\/]+))?\/?$/)
					,	self
					=	this
					,	item
					=	_.isUndefined(parts[3])
						?	parts[1]
						:	spec[parts[1]].associations[parts[3]].target

					if (_.isUndefined(spec[parts[1]]))
						logger.warning("False url <<"+valid_url+">>. Unknown entity <<"+parts[1]+">>")
					else
						if (!_.isUndefined(parts[3]) && _.isUndefined(spec[parts[1]].associations[parts[3]].target))
							logger.warning("False url <<"+valid_url+">>. Unknown entity <<"+spec[parts[1]].associations[parts[3]].target+">>")
						else
							{
								var	params
								=	{
										collection: parts[1]
									,	id: parts[2]
									,	association: parts[3]
									,	subcollection:	_.isUndefined(parts[3])
														?	undefined
														:	spec[parts[1]].associations[parts[3]].target
									,	query:	parsed_url.queryKey
									,	body: body
									,	collection_query:	_.objMap(
																_.object(
																	['type','page','ipp']
																,	[undefined]
																)
															,	function(value,attr)
																{
																	return 	_.isUndefined(parsed_url.queryKey[attr])
																			?	_.isUndefined(body.collection_query)
																				?	spec[item].collection[attr]
																				:	body.collection_query[attr]
																			:	parsed_url.queryKey[attr]
																}
															)
									}
								REST[method](
									item
								,	params
								)
								.then(
									function(result)
									{
										deferred
											.resolve(
												self
													.build(
														item
													,	Q(result)
													,	params.collection_query
													,	url
													)
											)
									}
								)
							}

					return	deferred.promise
				}
		}
	}
if(
	typeof module === 'undefined'
)
	this['Sigma'].portable.StoreFactory
	=	Factory
else
	module.exports
	=	Factory
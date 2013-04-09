var	Factory
=	function(
		_
	,	Q
	,	logger
	)
	{
	return	function(spec,spec_methods)
		{
			this.GET
			=	function(what,parsed)
				{	
					var	deferred
					=	Q.defer()
					,	type
					=	_.isUndefined(parsed.subcollection)
							?	_.isUndefined(parsed.id)
								?	'list'
								:	'show'
							:	_.contains(['has-many','has-many:through'],spec[parsed.collection].associations[parsed.association].type)
								?	'list'
								:	'show'

					if (type == 'list')
					{
						deferred
							.resolve(
								spec_methods
									.list(
										what
									,	parsed
									)
							)
					}
					else
						deferred
							.resolve(
								spec_methods
									.show(
										what
									,	parsed
									)
							)

					return	deferred.promise
				}
			this.POST
			=	function(url,parsed)
				{
					var	deferred
					=	Q.defer()
					,	item
					=	_.isUndefined(parsed.subcollection)
						?	parsed.collection
						:	parsed.subcollection

					switch(parsed.body.action)
					{
						case "create":
							deferred
								.resolve(
									spec_builders
										.build(
											item
										,	spec_methods
												.create(
													item
												,	parsed.body.query
												)
										)
								)
							break
						case "filter":
							parsed.body.collection_query
							=	_.isUndefined(parsed.body.collection_query)
								?	spec[item].collection
								:	_.objMap(
										spec[item].collection[attr]
									,	function(value,attr)
										{
											return	_.isUndefined(parsed.body.collection_query[attr])
													?	spec[item].collection[attr]
													:	parsed.body.collection_query[attr]
										}
									)
							deferred
								.resolve(
									spec_builders
										.build(
											item
										,	spec_methods
												.filter(
													item
												,	parsed
												)
										,	parsed.body.collection_query
										,	url
									)
								)
							break
						case "join":
							if (_.isEmpty(parsed.body.associations) || _.isUndefined(parsed.id))
							{
								logger.warning(
									_.isUndefined(parsed.id)
									?	"Required id in Action <<Join>>. Unable to complete request <<"+url+">>"
									:	"Empty body associations in <<POST>> requested <<"+url+">>"
								)
								deferred
									.resolve(
										{error:404}
									)
							}
							else
							{
								Q.all(
									_.map(
										parsed.body.associations
									,	function(assoc)
										{
											return	_.isUndefined(assoc.id)
													?	spec_builders
															.build(
																assoc.name
															,	spec_methods
																	.list(
																		assoc.name
																	,	{
																			collection: assoc.name
																		,	subcollection: undefined
																		,	query: assoc.query
																		,	collection_query: assoc.collection_query
																		}
																	)
															,	collection_query
															,	url
															)
													:	spec_builders
															.build(
																assoc.name
															,	spec_methods
																	.show(
																		assoc.name
																	,	{
																			collection: assoc.name
																		,	subcollection: undefined
																		,	id: assoc.id
																		}
																	)
															)
										}
									)
								).then(
									function(resource_collection)
									{
										deferred
											.resolve(
												spec_builders
													.build(
														parsed.collection
													,	spec_methods
															.join(
																parsed.collection
															,	{
																	id: parsed.id
																,	assocs: parsed.body.associations
																,	collection: resource_collection
																}
															)
													)
											)
									}
								)
							}
							break
						default:
							if (_.isEmpty(parsed.body))
								logger.warning("Empty body in <<POST>> requested <<"+url+">>")
							else
								logger.warning("Unkown action <<POST>> requested <<"+url+">>")
							deferred
								.resolve(
									{error:404}
								)
					}
			
					return deferred.promise
				}
			this.PUT
			=	function(url,parsed)
				{
					var	deferred
					=	Q.defer()

					if (_.isEmpty(parsed.body))
					{
						logger.warning("Empty body in <<PUT>> request <<"+url+">>")
						deferred
							.resolve(
								{error:404}
							)
					}
					else
						if (_.isUndefined(parsed.subcollection))
							deferred
								.resolve(
									spec_builders
										.build(
											parsed.collection
										,	spec_methods
												.update(
													parsed.collection
												,	parsed
												)
										)
								)
						else
						{
							logger.warning("Unable to update subcollection in request <<"+url+">>")
							deferred
								.resolve(
									{error:404}
								)
						}

					return deferred.promise
				}
			this.DELETE
			=	function(url,parsed)
				{
					var	deferred
					=	Q.defer()

					if (_.isUndefined(parsed.subcollection))
							deferred
								.resolve(
									spec_builders
										.build(
											parsed.collection
										,	spec_methods
												.delete(
													parsed.collection
													,	parsed
												)
										)
								)
						else
						{
							logger.warning("Unable to delete subcollection in request <<"+url+">>")
							deferred
								.resolve(
									{error:404}
								)
						}

					return deferred.promise
				}
		}
	}
if(
	typeof module === 'undefined'
)
	this['Sigma'].portable.RouterFactory
	=	Factory
else
	module.exports
	=	Factory
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
									spec_methods
										.create(
											item
										,	parsed.body.query
										)
								)
							break
						case "filter":
							deferred
								.resolve(
									spec_methods
										.filter(
											item
										,	parsed
										)
								)
							break
						case "join":
							if (_.isEmpty(parsed.body.associations))	{
								logger.warning("Empty body associations in <<POST>> requested <<"+url+">>")
								deferred
									.resolve(
										{
											type:	'ERROR'
										,	msg:	'Invalid Request: Empty body associations'
										,	code:	400
										}
									)
							}	else 
								if (_.isUndefined(parsed.id))	{
								logger.warning("Required id in Action <<Join>>. Unable to complete request <<"+url+">>")
								deferred
									.resolve(
										{
											type:	'ERROR'
										,	msg:	'Invalid Request: Required id in Action <<Join>>'
										,	code:	400
										}
									)
							}	else	{
								Q.all(
									_.map(
										parsed.body.associations
									,	function(assoc)
										{
											return	_.isUndefined(assoc.id)
													?	spec_methods
															.filter(
																assoc.name
															,	{
																	collection: assoc.name
																,	subcollection: undefined
																,	query: assoc.query
																,	collection_query: assoc.collection_query
																}
															)
													:	spec_methods
															.show(
																assoc.name
															,	{
																	collection: assoc.name
																,	subcollection: undefined
																,	id: assoc.id
																}
															)
										}
									)
								).then(
									function(promised_collection)
									{
										deferred
											.resolve(
												spec_methods
													.join(
														parsed.collection
													,	{
															id: parsed.id
														,	assocs: parsed.body.associations
														,	collection: promised_collection
														}
													)
											)
									}
								)
							}
							break
						default:
							if (_.isEmpty(parsed.body))
							{
								logger.warning("Empty body in <<POST>> requested <<"+url+">>")
								deferred
									.resolve(
										{
											type:	'ERROR'
										,	msg:	'Invalid Request: Empty body'
										,	code:	400
										}
									)
							}
							else
							{
								logger.warning("Unkown action <<POST>> requested <<"+url+">>")
								deferred
									.resolve(
										{
											type:	'ERROR'
										,	msg:	'Invalid Request: Unkown action'
										,	code:	400
										}
									)
							}	
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
								{
									type:	'ERROR'
								,	msg:	'Invalid Request: Empty Body'
								,	code:	400
								}
							)
					}
					else
						if (_.isUndefined(parsed.subcollection))
							deferred
								.resolve(
									spec_methods
										.update(
											parsed.collection
										,	parsed
										)
								)
						else
						{
							logger.warning("Unable to update subcollection in request <<"+url+">>")
							deferred
								.resolve(
									{
										type:	'ERROR'
									,	msg:	'Invalid Request: Unable to update subcollection'
									,	code:	400
									}
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
						spec_methods
							.delete(
								parsed.collection
							,	_.union(
									parsed.query
								,	[
										{
											key: 'id'
										,	value: parsed.id
										}
									]
								)
							).then(
								function(result)
								{
									deferred
										.resolve(
											result
										)
								}
							)
					else
					{
						logger.warning("Unable to delete subcollection in request <<"+url+">>")
						deferred
							.resolve(
								{
									type:	'ERROR'
								,	msg:	'Invalid Request: Unable to delete subcollection'
								,	code:	400
								}
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
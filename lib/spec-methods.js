var	Factory
=	function(
		_
	,	Q
	)
	{
	return	function(store,assoc_transforms)
		{
			//	WHAT (ENTITY) - PARAMS {collection,subcollection,id}
			this.show
			=	function(what,params)
				{
					var	deferred
					=	Q.defer()
					
					deferred
						.resolve(
							store.find(
								what
							,	_.isUndefined(params.subcollection)
								?	{
										query:
										[
											{
												key : 'id'
											,	value: params.id
											}
										]
									}
								:	assoc_transforms
										.get_filter_related(
											params.collection
										,	what
										,	{
												id: params.id
											}
										)
							)
						)

					return deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (collection,subcollection,query,id)
			this.list
			=	function(what,params)
				{
					var	deferred
					=	Q.defer()

					deferred
						.resolve(
							store.filter(
									what
								,	_.isUndefined(params.subcollection)
									?	params
									:	_.extend(
											assoc_transforms
												.get_filter_related(
													params.collection
												,	params.association
												,	{
														id: params.id
													}
												)
										,	params
										)
									)
						)

					return deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (collection,subcollection,body,id)
			this.filter
			=	function(what,params)
				{
					var	deferred
					=	Q.defer()
					,	query
					=	{
							query:	_.isUndefined(params.body.query)
									?	{}
									:	params.body.query
						,	collection_query:	_.omit(params.body.collection_query,'type')
						}

					deferred
						.resolve(
							store.filter(
									what
								,	_.isUndefined(params.subcollection)
									?	query
									:	_.extend(
											assoc_transforms
												.get_filter_related(
													params.collection
												,	what
												,	{
														id: params.id
													}
												)
										,	query
										)
								)
						)

					return deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (id,assocs,collection)
			this.join
			=	function(what,params)
				{
					var	deferred
					=	Q.defer()
					,	toJoin
					=	new Object()

					store.find(
						what
					,	{
							key : 'id'
						,	value: params.id
						}
					).then(
						function(resolved)
						{
							_.each(
								params.collection
							,	function(promised_resource,key)
								{
									return	_.extend(
												toJoin
											,	_.object(
													[params.assocs[key].name]
												,	[promised_resource]
												)
											)
								}
							)

							deferred
								.resolve(
									_.extend(
										resolved
									,	{
											join:	toJoin
										}
									)
								)
						}
					)

					return	deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (id, query)
			this.update
			=	function(what,params)
				{
					var	deferred
					=	Q.defer()

					deferred
						.resolve(
							store.update(
								what
							,	{
									key: 'id'
								,	value: params.id
								}
							,	params.body.query
							)
						)

					return deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (query)
			this.create
			=	function(what,query)
				{
					var deferred
					=	Q.defer()

					deferred
						.resolve(
							store.create(
								what
							,	query
							)
						)

					return deferred.promise
				}
			//	WHAT (ENTITY) - PARAMS (id)
			this.delete
			=	function(what,params)
				{
					var deferred
					=	Q.defer()

					deferred
						.resolve(
							store.delete(
								what
							,	params
							)
						)

					return deferred.promise
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
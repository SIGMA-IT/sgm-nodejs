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
												,	what
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
					=	{links:{},embeddeds:{}}
					
					_.each(
						params.collection
					,	function(resolved,key)
						{
							resolved.resource._links.self.rel = params.assocs[key].name
							_.extend(
								toJoin.links
							,	_.object(
									[params.assocs[key].name]
								,	[resolved.resource._links.self.href]
								)
							)
							_.extend(
								toJoin.embeddeds
							,	_.object(
									[params.assocs[key].name]
								,	[resolved]
								)
							)
						}
					)

					store.find(
						what
					,	{
							key : 'id'
						,	value: params.id
						}
					).then(
						function(resolved)
						{
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
							,	_.pick(params,'id')
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
							,	_.pick(params,'id')
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
var	Factory
=	function(
		_
	,	Q
	)
	{
	return	function(sources_list,loader)
		{
			this.sources
			=	_(sources_list).objMap(loader)
			this.own_filter
			=	function(filter,item)
				{
					var bool = new Array()
					_.each(
						_.without(_.keys(filter),'type','offset','limit')
					,	function(key)
						{
							bool.push(
								_.has(item,key)
									?	item[key] == filter[key].replace('+',' ')
									:	false
							)
						}
					)
					return	_.isEmpty(
								_.without(bool,true)
							)
				}
			this.filter
			=	function(what,filter)
				{
					var	self
					=	this
					,	getFiltered
					=	function(items,offset,limit)
						{
							return	(offset && limit)
									?	_.filter(
											items
										,	function(item,index)
											{
												return (index >= offset) && (index <= offset+limit)	
											}
										)
									:	(!offset && limit)
										?	_.filter(
												items
											,	function(item,index)
												{
													return index <= limit
												}
											)
										: 	(offset && !limit)
											?	_.filter(
													items
												,	function(item,index)
													{
														return index >= offset
													}
												)	
											:	items
						}
					,	deferred
					=	Q.defer()

					deferred
						.resolve(
							{
								items: 	getFiltered(
											filter.through
											?	_(
													_(self.sources[filter.through.name])
														.filter(
															function(item)
															{
															return	item[filter.through.key]==filter.through.id
															}
														)
												).map(
													function(item_th)
													{
													return	_(self.sources[what])
																.find(
																	function(item)
																	{
																	return	item[filter.key]==item_th[filter.through.target_key]
																	}
																)
													}
												)
											:	(filter.key&&filter.id)
												?	_(self.sources[what])
														.filter(
															function(item)
															{
															return	item[filter.key]==filter.id
															}
														)
												:	((!filter.key)&&(!filter.id))
													?	_(self.sources[what])
															.filter(
																function(item)
																{
																	return self.own_filter(filter,item)
																}
															)
													:	[]
										,	_.isUndefined(filter.offset)
											?	false
											:	filter.through
												?	filter.offset
												: 	filter.offset-1
										,	_.isUndefined(filter.limit)
											?	false
											:	filter.limit	
										)
								,	count: 	self.sources[what].length
							}
						)

					return deferred.promise
				}
			this.find
			=	function(what,filter)
				{
					var	deferred
					=	Q.defer()
					,	sources
					=	_(sources_list).objMap(loader)

					deferred
						.resolve(
							{
								items: 	_(sources[what])
											.find(
												function(item)
												{
												return	item[filter.key]==filter.id
												}
											)
										|| {}
							,	count: 	sources[what].length
							}
						)

					return deferred.promise
				}
			this.update
			=	function(what,prototype,query)
				{
					var	self
					=	this
					,	deferred
					=	Q.defer()
					,	sources
					=	_(sources_list).objMap(loader)
					var found
					=	_.first(
							this
								.sources[what]
									.filter(
										function(item)
										{
											return self.own_filter(prototype,item)
										}
									)
						)
					
					_.extend(
						found
					,	_.pick(
							query
						,	_.intersection(
								_.keys(found)
							,	_.keys(query)
							)
						)
					)

					deferred
						.resolve(
							{
								items: found
							,	count: sources[what].length
							}
						)

					return deferred.promise	
				}
			this.create
			=	function(what,query)
				{
					var	deferred
					=	Q.defer()
					,	new_element
					=	_.extend(
							{	
								id: parseInt(_.last(sources[what]).id)+1
							}
						,	query
						)

					sources[what].push(new_element)

					deferred
						.resolve(
							{
								items: new_element
							,	count: sources[what].length
							}	
						)

					return deferred.promise
				}
			this.delete
			=	function(what,query)
				{
					var	deferred
					=	Q.defer()
					,	self
					=	this
					this.find(what,query)
					.then(
						function(found)
						{
							var	filtered
							=	self
									.sources[what]
										.filter(
											function(item)
											{
												return !self.own_filter(query,item)
											}
										)
							,	el_msg
							=	(filtered.length == self.sources[what])
								?	'ERROR'
								:	'SUCCESS'
							self.sources[what] = filtered
							deferred
								.resolve(
									{
										items:
										{
											msg: el_msg
										}
									,	count: self.sources[what].length
									}	
								)
						}
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

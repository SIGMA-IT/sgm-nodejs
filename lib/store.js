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

					deferred
						.resolve(
							{
								items: 	_(this.sources[what])
											.find(
												function(item)
												{
												return	item[filter.key]==filter.id
												}
											)
										|| {}
							,	count: 	this.sources[what].length
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

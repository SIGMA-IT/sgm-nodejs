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
					filter['type']
					=	filter.type||undefined
					filter['offset']
					=	filter.page||1 //El offset al utilizar splice debe estar incrementado en 1
					filter['limit']
					=	filter.ipp||10
					,	getFiltered
					=	function(array,offset,limit)
						{
							var result = new Array()
						 	_.each(
								array
							,	function(item,index)
								{
									if ((index >= offset) && (index <= offset+limit))	
										result.push(item)
								}
							)
							return result
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
													?	self.sources[what]
													:	[]
										,	filter.through
											?	filter.offset
											: 	filter.offset-1
										,	parseInt(filter.limit)
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

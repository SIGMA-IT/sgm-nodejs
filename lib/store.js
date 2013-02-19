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
			this.apply_filter
			=	function(filter,item)
				{
					var bool = new Array()
					_.each(
						_.keys(filter)
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
			this.getItem
			=	function(what,filter)
				{
					var	self
					=	this
					,	query
					=	(_.isUndefined(filter.source) && _.isEmpty(filter.query))
						?	_.object(
								[filter.key]
							,	[filter.value]
							)
						:	filter.query
					,	source_item
					=	_.find(
							self.sources[
									_.isUndefined(filter.source)
									?	what
									:	filter.source
								]
						,	function(item)
							{
								return	_.isUndefined(filter.source)
										?	self.apply_filter(query,item)
										:	item[filter.source_key] == filter.source_value
							}
						)

					return	_.isUndefined(filter.source)
							?	source_item
							:	_.find(
									self.sources[what]
								,	function(item)
									{
										return	item[filter.target_key] == source_item[filter.key]
									}
								)
				}
			this.getItems
			=	function(what,filter)
				{
					console.log("GETITEMS",arguments)
					var	self
					=	this
					return	_.isUndefined(filter.through)
							?	_(self.sources[what])
									.filter(
										function(item)
										{
											return self.apply_filter(filter.query,item)
										}
									)
							:	_.filter(
									self.sources[filter.through.target]
								,	function(target_item)
									{
										return 	_.find(
													self.sources[filter.through.name]
												,	function(through_item)
													{
														return through_item[filter.through.target_key] == target_item.id
													}
												)
									}
								)
				}
			this.filter
			=	function(what,filter)
				{
					console.log("FILTER")
					var	self
					=	this
					,	deferred
					=	Q.defer()
					,	getFiltered
					=	function(items,offset,limit)
						{
							offset	=	_.isUndefined(offset)
										?	0
										:	offset
							limit	=	(_.isUndefined(limit) || limit == 0)
										?	items.length
										:	limit

							return	_.filter(
										items
									,	function(item,index)
										{
											return (index >= offset) && (index <= offset+limit)	
										}
									)
						}

					deferred
						.resolve(
							{
								items: 	getFiltered(
											self.getItems(what,filter)
										,	filter.collection_query.offset
										,	filter.collection_query.limit	
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
								items:	this.getItem(what,filter)	
							,	count: 	this.sources[what].length
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
											return self.apply_filter(prototype,item)
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
												return !self.apply_filter(query,item)
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

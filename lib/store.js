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
			this.getSource
			=	function(what,key,value)
				{
					return	_.find(
								this.sources[what]
							,	function(item)
								{
									return	item[key] == value
								}
							)
				}
			this.getItemsWhithoutSource
			=	function(what,filter)
				{
					var	self
					=	this
					return	_.filter(
								self.sources[what]
							,	function(item)
								{
									return self.apply_filter(filter.query,item)
								}
							)
				}
			this.getItemsFromSource
			=	function(what,filter)
				{
					var	source
					=	this.getSource(filter.source,filter.source_key,filter.source_value)
					,	self
					=	this
					,	query
					=	_.extend(
							filter.query
						,	_.object(
								[filter.target_key]
							,	[source[filter.key]]
							)
						)
					return	_.isUndefined(filter.through)
							?	_.filter(
									self.sources[what]
								,	function(item)
									{
										return	self.apply_filter(query,item)
									}
								)
							:	_.filter(
									self.sources[filter.through.target]
								,	function(target_item)
									{
										return 	!_.isUndefined(
													_.find(
														self.sources[filter.through.name]
													,	function(through_item)
														{
															return through_item[filter.through.target_key] == target_item.id
														}
													)
												) && self.apply_filter(query,item)
									}
								)
				}
			this.filter
			=	function(what,filter)
				{
					var	self
					=	this
					,	deferred
					=	Q.defer()
					,	ipp
					=	_.isUndefined(filter.collection_query.ipp)
						?	0
						:	parseInt(filter.collection_query.ipp)
					,	page
					=	_.isUndefined(filter.collection_query.page)
						?	1
						:	parseInt(filter.collection_query.page)
					,	getFiltered
					=	function(items,offset,limit)
						{
							limit	=	(_.isUndefined(limit) || limit == 0)
										?	items.length
										:	limit

							return	_.filter(
										items
									,	function(item,index)
										{
											return (index >= offset) && (index < offset+limit)	
										}
									)
						}
					deferred
						.resolve(
							{
								items: 	getFiltered(
											_.isUndefined(filter.source)
											?	self.getItemsWhithoutSource(what,filter)
											:	self.getItemsFromSource(what,filter)
										,	page*ipp - ipp
										,	ipp
										)
								,	count: 	self.sources[what].length
							}
						)

					return deferred.promise
				}
			this.getItemWhithoutSource
			=	function(what,filter)
				{
					return	this.getSource(what,filter.key,filter.value)
				}
			this.getItemFromSource
			=	function(what,filter)
				{
					var	source
					=	this.getSource(filter.source,filter.source_key,filter.source_value)
					,	self
					=	this

					return	_.isUndefined(filter.through)
							?	_.find(
									self.sources[what]
								,	function(item)
									{
										return	item[filter.target_key] == source[filter.key]
									}
								)
							:	_.find(
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
			this.find
			=	function(what,filter)
				{
					var	deferred
					=	Q.defer()

					deferred
						.resolve(
							{
								items:	_.isUndefined(filter.source)
										?	this.getItemWhithoutSource(what,filter)
										:	this.getItemFromSource(what,filter)
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

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
			this.get_through_items
			=	function(through,source,source_key)
				{
					var self
					=	this

					return	_.reduce(
								_.rest(through)
							,	function(result,iteration)
								{
									return	_.map(
												result
											,	function(item)
												{
												return 	_.filter(
															self.sources[iteration.target]
														,	function(through_item)
															{
																return through_item[iteration.key] == item[iteration.target_key]
															}
														)
												}
											)
								}
							,	_.filter(
									self.sources[_.first(through).target]
								,	function(through_item)
									{
										return through_item[_.first(through).key] == source[source_key]
									}
								)
							)
				}
			this.get_through_item
			=	function(through,source,source_key)
				{
					var self
					=	this

					return	_.reduce(
								_.rest(through)
							,	function(result,iteration)
								{
									return	_.map(
												result
											,	function(item)
												{
												return 	_.find(
															self.sources[iteration.target]
														,	function(through_item)
															{
																return through_item[iteration.key] == item[iteration.target_key]
															}
														)
												}
											)
								}
							,	_.find(
									self.sources[_.first(through).target]
								,	function(through_item)
									{
										return through_item[_.first(through).key] == source[source_key]
									}
								)
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
					,	through
					=	_.isEmpty(filter.through)
						?	undefined
						:	_.last(filter.through)
					,	through_items
					=	_.isEmpty(filter.through)
						?	filter.through
						:	self.get_through_items(
									filter.through
								,	source
								,	filter.source_key
								)

					return	_.isEmpty(filter.through)
							?	_.filter(
									self.sources[what]
								,	function(item)
									{
										return	item[filter.target_key] == source[filter.key] && self.apply_filter(filter.query,item)
									}
								)
							:	_.filter(
									self.sources[what]
								,	function(target_item)
									{
										return	_.find(
													through_items
												,	function(through_item)
													{
														return (target_item[filter.target_key] == through_item[through.target_key]) && self.apply_filter(filter.query,target_item)
													}
												)
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
					,	through
					=	_.isEmpty(filter.through)
						?	undefined
						:	_.last(filter.through)
					,	through_item
					=	_.isEmpty(filter.through)
						?	filter.through
						:	self.get_through_item(
									filter.through
								,	source
								,	filter.source_key
								)

					return	_.isEmpty(filter.through)
							?	_.find(
									self.sources[what]
								,	function(item)
									{
										return	item[filter.target_key] == source[filter.key]
									}
								)
							:	_.find(
									self.sources[what]
								,	function(target_item)
									{
										return	target_item[filter.target_key] == through_item[through.target_key]
									}
								)
				}
			this.find
			=	function(what,filter)
				{
					var	deferred
					=	Q.defer()
					,	self
					=	this

					deferred
						.resolve(
							{
								items:	_.isUndefined(filter.source)
										?	self.getItemWhithoutSource(what,filter)
										:	self.getItemFromSource(what,filter)
							,	count: 	self.sources[what].length
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

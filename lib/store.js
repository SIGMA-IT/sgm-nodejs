var	fs
=	require('fs')
,	fsExists
=	fs.existsSync || path.existsSync
var	Factory
=	function(
		_
	,	Q
	,	logger
	)
	{
	return	function(config,program,transforms,mappings)
		{
			var	transforms_input
			=	new Object()

			_.each(
				transforms
			,	function(transform,name)
				{
					if (_.isUndefined(transform.source))
					{
						var	found
						=	_.find(
							_.union(config.paths.input,[program.input])
						,	function(path)
							{
								var full_path
								=	_.contains(config.paths.input,path)
									?	path+'data/json'
									:	path
								return fsExists(
											full_path
										+	'/'
										+	transform.storage.name
										+	'.json'
										)
							}
						)
						var found_path
						=	_.contains(config.paths.input,found)
							?	found+'data/json'
							:	found
						if (_.isString(found))	
							_.extend(
								transforms_input
							,	_.object(
									[name]
								,	[
										found_path
									+	'/'
									+	transform.storage.name
									+	'.json'
									]
								)
							)
						else
							logger.warning('Data Input: no such file '+found_path+'/'+transform.storage.name+'.json')
					}	
				}
			)

			this.sources
			=	new Object()


			var self
			=	this
			
			_.each(
				transforms_input
			,	function(input,name)
				{				
					_.extend(
						self.sources
					,	_.object(
							[name]
						,	[
								JSON
									.parse(
										fs.readFileSync(input,'utf8')
									)
							]
						)
					)
				}
			)

			_.each(
				transforms
			,	 function(transform,name)
				{
					if	(_.isString(transform.parent))
						_.map(
							self.sources[transform.parent]
						,	function(parent)
							{
								var son
								=	_.find(
										self.sources[name]
									,	function(posible_son)
										{
											return	posible_son[transforms[name].parent_key] == parent.id
										}
									)

								return	_.isUndefined(son)
											?	parent
											:	_.extend(
													parent
												,	son
												)

							}
						)		
				}
			)

			this.apply_filter
			=	function(filters,item)
				{
					var bool = new Array()
					_.each(
						filters
					,	function(filter)
						{
							if (_.isUndefined(filter.criteria) || filter.criteria == '=')
								bool.push(item[filter.key] == filter.value)
							else
							if (filter.criteria == '>')
								bool.push(parseFloat(item[filter.key]) > parseFloat(filter.value))
							else
							if (filter.criteria == '>=')
								bool.push(parseFloat(item[filter.key]) >= parseFloat(filter.value))
							else
							if (filter.criteria == '<')
								bool.push(parseFloat(item[filter.key]) < parseFloat(filter.value))
							else
							if (filter.criteria == '<=')
								bool.push(parseFloat(item[filter.key]) <= parseFloat(filter.value))
							else
							if (filter.criteria == '%')
								bool.push(item[filter.key].indexOf(filter.value) != -1)
							else
								bool.push(false)
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
										return	item[filter.target_key] == source[filter.key] 
											&&	self.apply_filter(filter.query,item)
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
														return	(target_item[filter.target_key] == through_item[through.target_key])
															&&	self.apply_filter(filter.query,target_item)
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
								items: 	Q(
											getFiltered(
												_.isUndefined(filter.source)
												?	self.getItemsWhithoutSource(what,filter)
												:	self.getItemsFromSource(what,filter)
											,	page*ipp - ipp
											,	ipp
											)	
										)
							,	count: 	Q(
											_.isUndefined(filter.source)
											?	self.getItemsWhithoutSource(what,filter).length
											:	self.getItemsFromSource(what,filter).length
										)
							}
						)

					return deferred.promise
				}
			this.getItemWhithoutSource
			=	function(what,filter)
				{
					var	self
					=	this

					return	_.find(
								self.sources[what]
							,	function(item)
								{
									if (_.isUndefined(filter) || _.isEmpty(filter))
										return false
									else
										return	self.apply_filter(filter.query,item)
								}
							)
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
								items:	Q(
											_.isUndefined(filter.source)
											?	self.getItemWhithoutSource(what,filter)
											:	self.getItemFromSource(what,filter)
										)
							,	count: 	Q(self.sources[what].length)
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
					,	found
					=	_.first(
							this.sources[what]
								.filter(
									function(item)
									{
										return self.apply_filter([prototype],item)
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
								items: Q(found)
							,	count: Q(this.sources[what].length)
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
								id: parseInt(_.last(this.sources[what]).id)+1
							}
						,	query
						)

					this.sources[what].push(new_element)

					deferred
						.resolve(
							{
								items: Q(new_element)
							,	count: Q(this.sources[what].length)
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
					,	found
					=	new Array()
					,	filtered
					=	_.filter(
							this.sources[what]
						,	function(item)
							{
								if	(!self.apply_filter(query,item))
									return true
								else
								{
									found.push(item)
									return false
								}
							}
						)

					this.sources[what] = filtered

					deferred
						.resolve(
							_.isEmpty(found)
							?	{
									type:	'ERROR'
								,	msg:	'Not Found: Resource Not Found'
								,	code:	404
								}
							:	{
									type:	'SUCCESS'
								,	msg:	'OK: Resource Deleted'
								,	code:	200
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

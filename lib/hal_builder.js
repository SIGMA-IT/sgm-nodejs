(
	function(exports)
	{
		exports.make_hal_builder
		=	function(_,hal)
			{
			var	hal_builder
				=	function(aData,uri)
					{
						this.resource
						=	new	hal.Resource(aData,uri)
					return	this
					}
				hal_builder
				.prototype.link
				=	function(aLink, isTrue)
					{
					var	self=this
						if(isTrue==false)
							return	this
						_.each(
							aLink
						,	function(link_item,rel)
							{
								if(_.isArray(link_item))
									_.each(
										_.map(
											link_item
										,	function(link_item)
											{
											var	result
											=	{}
												result[rel]
												=	link_item
											return	result
											}
										)
									,	function(singlelink)
										{
											self.link(singlelink)
										}
									)
								else
								{
									self.resource
									.link(rel,link_item)
								}
							}
						)
					return	this
					}
				hal_builder
				.prototype.embedded
				=	function(anEmbedded)
					{
					var	self=this
						_.each(
							anEmbedded
						,	function(item,key)
							{
								self.resource
								.embed(
									key
								,	(
										_.isArray(item)
											?_.map(
												item
											,	function(i)
												{
													return	i.resource
												}
											)
											:item.resource
									)
								,	false
								)
							}
						)
					return	this
					}
				hal_builder
				.prototype.get_document
				=	function()
					{
					return	this.resource.toJSON()
					}
			return	hal_builder
			}
	}
)(
	typeof exports === 'undefined'
		?this['Sigma'].portable //ATENTI ACA
		:exports
)

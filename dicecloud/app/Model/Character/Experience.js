Experiences = new Mongo.Collection("experience");

Schemas.Experience = new SimpleSchema({
	charId:      {type: String, regEx: SimpleSchema.RegEx.Id, index: 1},
	name:		 {type: String, optional: true, trim: false, defaultValue: "New Experience"},
	description: {type: String, optional: true, trim: false},
	value:       {type: Number, defaultValue: 0},
	dateAdded:   {
		type: Date,
		autoValue: function() {
			if (this.isInsert) {
				return new Date();
			} else if (this.isUpsert) {
				return {$setOnInsert: new Date()};
			} else {
				this.unset();
			}
		},
	},
});

Experiences.attachSchema(Schemas.Experience);

Experiences.attachBehaviour("softRemovable");

Experiences.allow(CHARACTER_SUBSCHEMA_ALLOW);
Experiences.deny(CHARACTER_SUBSCHEMA_DENY);

# Postgres for inbox

Now that we have a frontend skeleton of the inbox for Decision Broker, we should set it up so that our database has all required fields to populate it.

Here's what tables I'm thinking of:

## decision_items table

id: id of decision item. required.
board_id: id of board that this decision item is associated with. required
priority: priority of the decision item. Initially "Low", "Medium", "High" and "Critical" but I can see us allowing users to define their own priorities. required.
assignee: id of user that is assigned on the current step. Can be changed to null or undefined, whatever postgres uses in these cases.
tags: list of tags associated with this decision item, only tags allowed by board are possible. Can be null/undefined, whatever postgres uses in these cases.
question: string of text that contains question from user. required
questioner_id: id of user that created the question. required
question_time_stamp: exact time that the question was generated. required
step: id of step this decision is on. Initially only "Decision needed" or "Answered" but I can see us allowing intermediate steps that live between those two steps. see steps table. required

## steps table

board_id: id of board that this step belongs to.
name: string name of step

## tags table

board_id: id of board that this tag was created in
tag: display text of tag

## boards table

id: id so we can identify the table
name: the display name of the table
owner_id: id of user that created this board (see users table id column)
steps: "Needs decision" and "Answered"
archived: true or false

## users table

id: id of user
name: display name of the user

I am not under the impression that these requirements are perfect, so interrogate me about this plan. Do not write to this file, instead create a nearby specifications.md file that we will work off of for this sprint.

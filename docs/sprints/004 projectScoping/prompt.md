I want to describe in this file what the overall project is trying to do.

This project is a proof of concept for a rather challenging idea.

## Basic Concept

I have found my work is much more efficient when the A.I. prompts me for the next decision as opposed to me trying to figure everything out.   One thing that's worked well is for the AI to create a decision tree and then prompt me, kind of like the popular grill-me skill.

This works well for several reasons.
1. It takes me through a logical sequence of questions to make sure that unknowns are solved in a systematic way.
2. It ensures there is very good alignment between my understanding and the understanding of the AI.

This does also create several challenges and opportunities.
1. Because the AI sessions often take 10 to 30 minutes to do their thinking, I end up, rather than waiting, running multiple sessions in parallel.  Like many people, I can have from three to five Claude sessions going on at any one time.
What this means is that I'm constantly flipping between terminal sessions, trying to figure out my next prompt where it is, and my attention gets scattered.  It is slightly awkward to manage.
2. The opportunity is to scale the solution . In other words, today, every prompt can only go to me and for me, so I'm not really scaling myself out to have other people involved in my conversation.  My hope with this system is that I will be able to direct certain questions to different people.  I'm also hoping my whole team can work together through one kind of question interface.
3. I want to capture the decisions that are being made and help build rules to make that more effective.
So, for example, if I am being asked the same or similar questions over and over again, I would like to be able to create a rule that is logged and maintained as a first-class artifact. That allows me to automatically feed the appropriate context to that question in.  To be a little more concrete, maybe some of these questions can be answered automatically with this extra context or rules.  I have not yet figured out exactly how to do this, but this is the goal.
4.  I would like to scale this to enterprise users.  The idea is that if many individuals are making decisions and creating rules, it helps make those individuals efficient.  Also, the rules that are captured become a corporate asset.  Also, in some ways, it's like organic workflow creation as opposed to a structured, planned workflow.
Enterprise users therefore do not need to be experts in developing or using terminals or Git or CLAUDE.
I mentioned users of this system will be prompted by questions from this database.
And using methods that need more clarity, these answers to these questions will get fed back into the AI and CLAUDE or OpenAI sessions.

## Basic Workflow

One way to think about it is we're creating a collaboration tool between AI sessions and a group of users.

1. the user initates work item.  this may be from a claude ai session (similar to  ask user tool), it may be from 
a message in app (request web page, slack, text mesage, email), etc.  Someway there is a generic connector that recieves (or pushes) new work items.  Lets call that decision requests for now.

These decision/work item  requests would follow a standardized and structured format.
We still have to work out what that format is.  it may be json, xaml, or a new mime-type for a file. this needs more thought.

2. this decsion/work item request will come in via an connector (cli, web, app, mail, telegram, slace, etc), where it will
be formatted into a structured decision/work item request.  The decision/work item request may have files or images. design layouts, color pallets, drawings, pdfs or basically any file type as attachments.  
For example, a simple decision request would be for somebody to approve something.
Another decision request might be for somebody to choose between a series of structured options.
Or another decision request might be for somebody to add more content or details to another decision request. (This is an example where the terminology decision request can be misleading and maybe work item is preferred.)

3. The work item will then be stored in the database (in this case, Postgres database) with attachments stored in a file server somewhere.  Before it is stored in the database, it's given routing information on who this request needs to go to.  Kind of like an inbox, that is designed for this REQUEST GROUP or TYPE.  We might structure it so all work items require an inbox identifier.

4. Users would then monitor inboxes like they monitor email today.  except it is possilbe several people could monitor one group inbox.  there would also be individual inboxes, and workflow inboxes.

When a user opens a work item from an inbox there will be a dynamically generated user interface depending on the work item contents. (It might be a form with links to see attachments)
The user will have an option to answer the questions, or forward the questions, or be able to create rules that can answer these questions.  By creating rules to answer these questions, we are creating new corporate assets.
It is possible the rule could be to forward the request to somebody else.
It is possible the request could be that we need approval or concensus from this group of people.
It is possible this rule could be that if certain information is not specified, it goes back to the originator to specify it.  In this way, it can create a dialog.

## Initial ideas
1.  Right now, I am thinking about making large portions of this open source.  There may be a paid tier to host and service this, but I don't want companies feeling like they might get locked in to a small company.
2.  i would like the work item strucxture to be based on existing declaritive form structures, that are somewhat standardized, and that can be made to work on html, ios, and android clients.  Someway to dynamically generate a form.
3.  i would like the system to support workos.  the end goal is that corporations can integrate this into their companies and not have to share their data outside the organization.
4.  I want to be able to target non-technical users.  it you can use email, you can use decision broker.
5.  i want it to organically spread.  somehow, i am not yet sure how, i would like to be able to 
provide a url that non-autenticated uses can access data, and use the system by just getting access to the url.
they are not required to install an app (however they will be encouraged to signup, or get the app)
6.  i want it to dynamically create work flows.  what i mean, that if each individual user optimizes their own work
then a group of users, could end up defining a workflow.  for example one user may recived work items from customers
and then triage them through rules.  the rules couldu add information or context and provide custom  routing.  a rule couldl for example invoke a skill to do a process.  The collection of all rules, could define the corporate workflows and operating book.
7. a key part of what i am thinking about is how to "tap into" the user question tool.  so questions are routed to the decision broker and then back to the ai sessoin.  I think this might be an early prototype concept.  I was considering developing oru own custom terminal that claude might run inside of.  so when an ai issues a question or prompt for user input, our terminal can capture that, and route it approprpiately.

I would like you to ask me some clarifying questions, with a goal to putting a scope around this.
i would like you to generate a document called docs\live\Project Overview.md
as the output of this initial scoping.

The document does not need to specify how we do things, but is intended to clarify
the goals of the project, and a high level description of the project.


the outputs from this project is a proof of concept.  It does not need to be production quality,
but it does need to demonstrate how all the elements can work together.

So maybe some early steps are just to explore options and consider risks.
It would be good if this document could recommend steps and stages that we go about doing that.

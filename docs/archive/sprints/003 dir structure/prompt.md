so i want to setup this project, so that it can eventually have an ios app, an android app, a cli, and a web api.  i want all of these interface layers to go through a middle tier layer that contains all the code logic, (I want to ensure that
no intterface layer accesses the data layer directly) and
  finally i want a data tier.  the data tier we need to be able to swap out different file hosting, and different database hosting.  It is concievable that different customers will want their data hosted differently or internallly.

  i would like to setup a directory struture appropriately.

I'd like you to propose some structure for this.

I would like the docs directory to remain outside of this hierarchy structure because I want to develop in sprints and keep the live documents updated for everything in one common area.

I'd also like you to conduct just research on best practices for doing this, a little bit briefly.


  i also want to document this archtiecture in docs\live\architecture.md

  I would like to avoid confusion between architecture.md and tech stack.md
  Hopefully there's a way to separate their responsibilities.
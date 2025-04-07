# Design Manual

This is the Department for Education Design Manual

## Contributing
Please see our [Contributing Guide](CONTRIBUTING.md) for details on how you can contribute to this project.


## Prerequisites

Node.JS LTS version

GitHub

and Nodemon installed globally

Run `npm i nodemon -g`

## Then run the app

Add a .env file and add the following keys:

```
airtableFeedbackKey=xxx
airtableFeedbackBase=xxx
```
Contact DesignOps for the keys to use in your local environment. These must never be checked in to source code - the file is included in the .gitignore file.

Run `npm install`

Run `npm run dev`

While this is the same command for GOV.UK prototypes, this app is not built using the kit.

We've just made it easier to remember what commands to run for those unfamiliar with 
running Node apps locally.

> Information
>
> When running this command, you may see "Deprecation Warning: Using / for division outside of calc() is deprecated and will be removed in Dart Sass 2.0.0."
> 
> These are from the GOV.UK Frontend and you do not need to do anything.

---
description: 'How to write docs, when to write them, and where to place them.'
---

# Writing documentation

We invite you to help us build a comprehensive library of world-class documentation.
With your enthusiasm and expertise, everyone in the Opstrace community will benefit.

## Get on your marks

Before your start crafting lovely sentences, keep these thoughts in mind:

* We encourage you to modify any Markdown doc you want as part of your PR. This ultimately allows you to create fresh and practical documentation.
* GitHub is the source of truth for our documents.
* We use [markdownlint](https://github.com/DavidAnson/markdownlint) to define our canonical document style. Run the following to ensure your changes will pass CI: `make lint-docs`.

## Your toolkit (how to edit docs)

You can edit the Markdown files using your favorite editor.
Please find some recommendations for doing this below.

We suggest that you use VS Code.
And if you like using that, we suspect you’ll enjoy working with the following extensions.
They simply make it easier and faster to write Markdown:

* [vscode-markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint) (for in-line markdownlint feedback)
* [Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one) (for convenient keyboard shortcuts, such as `Ctrl + B` for bold text)
* [VScode Paste Image](https://marketplace.visualstudio.com/items?itemName=mushan.vscode-paste-image) (to enable `Ctrl` + `Alt` + `V` to paste images from your clipboard to the document and the filesystem)

You might find it helpful to use the native VS Code "Open Preview to the Side" feature (`Ctrl` + `K` + `V`).
That said, we prefer to use the following extension to style its output more like GitHub:
[Markdown Preview Github Styling](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-preview-github-styles).

## Keep it clean

When your peers will be reading your documentation, you want it to be the best it can be.
We recommend using [Grammarly](https://www.grammarly.com) to check for clarity, grammar, and proper word usage.
Hey, even professional technical writers need another set of eyes.

## When to update docs

Ideally, docs is updated in the same pull request that also contains the corresponding code changes. Of course, some documents may not require updating. See our [pull request template](https://github.com/opstrace/opstrace/blob/main/.github/pull_request_template.md) to better assess what may or may not need updates.


## The doc creation possibilities

You can write documentation for these categories, which correspond to 3 groups in the summary file:

1. **Introductory content:** Cover the high-level aspects of a topic and answer common questions in a quick, efficient manner.
2. **Guides:** Walk readers through specific, goal-based tasks. These documents are meant to be read from beginning to end, so they should contain all of the necessary information for the specific task.
3. **Reference documents:** Help developers locate the information they need to accomplish specific tasks. Typically, you organize content in lists rather than with formal sentences and paragraphs.

## Notes on style

Rather than adopt a single style wholesale, here we iteratively build up our own style guidelines for writing docs by collecting the best ideas from our community over time.
That being said, we tend to follow the most common American English usage and idioms, and prefer a casual rather than formal tone.
If you have a suggestion, please open a PR to start the conversation.

As hinted at in the previous section, the guides and intro documents (e.g. quick start) should be written in a casual, conversational style.
This includes a variety of sentence structures, word choices, etc.
It also informs decisions such as using the common form of the word “data” (which takes many forms: singular noun, plural now, mass noun…  probably some other things…).
The reference documents should be written in very clear and concise terms, with as few words as possible.
They are meant to be linked into, rather than read all the way through.
All that being said, proper grammar and punctuation should always be used—this will be the one constant across all of the docs.

Here is a laundry list of various style, grammar, and other choices we've made over time:

* We follow [semantic line breaks (sembr.org)](https://sembr.org), requiring each sentence written in Markdown to be on its own line.
* Capitalization should follow [commonly accepted English guidelines](https://www.grammarly.com/blog/capitalization-rules/).
  For example, a capital letter should be used to signal the start of a new sentence, differentiate titles and major headings from the body of the text (using [title case](https://en.wikipedia.org/wiki/Title_case)), and show [proper nouns](https://www.grammarly.com/blog/proper-nouns/) and product names.
* Use colons when introducing a block quote or code block.
* Use the verb _log in to_ over _log into_ or _login to_; as a noun, use _login_.  ([Reference](https://grammarist.com/spelling/log-in-login))
* Prefer the singular use of _data,_ as in _this data_.
* Avoid referring to Opstrace as a "cluster".
  Instead, prefer referring to _an Opstrace instance_, _an Opstrace installation_, or simply by the proper noun _Opstrace_.
  For example: _log in to the Opstrace instance_ or _send data to Opstrace._
* [Quotation marks](https://en.wikipedia.org/wiki/Quotation_marks_in_English#Nonstandard_usage) can be tricky to use in English: use them for quotations, highlighting unusual usage, an invented term, or calling out someone else's terms; do not use them for irony or emphasis, and beware of the downsides of [scare quotes](https://en.wikipedia.org/wiki/Scare_quotes).
  Alternatives may include italicization or capitalization.
  When in doubt, use quotation marks sparingly.

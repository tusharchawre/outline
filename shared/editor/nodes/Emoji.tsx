import { Token } from "markdown-it";
import {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
  Schema,
} from "prosemirror-model";
import { Command, TextSelection } from "prosemirror-state";
import { Primitive } from "utility-types";
import Extension from "../lib/Extension";
import { getEmojiFromName } from "../lib/emoji";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import emojiRule from "../rules/emoji";

export default class Emoji extends Extension {
  get type() {
    return "node";
  }

  get name() {
    return "emoji";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        style: {
          default: "",
        },
        "data-name": {
          default: undefined,
        },
      },
      inline: true,
      content: "text*",
      marks: "",
      group: "inline",
      selectable: false,
      parseDOM: [
        {
          tag: "strong.emoji",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLElement) =>
            dom.dataset.name
              ? {
                  "data-name": dom.dataset.name,
                }
              : false,
        },
      ],
      toDOM: (node) => {
        const name = node.attrs["data-name"];
        if (name && getEmojiFromName(name)) {
          return [
            "strong",
            {
              class: `emoji ${name}`,
              "data-name": name,
            },
            getEmojiFromName(name),
          ];
        }
        return ["strong", { class: "emoji" }, `:${name}:`];
      },
      toPlainText: (node) => {
        const name = node.attrs["data-name"];
    if (!name) {
        console.error("Missing data-name attribute on node:", node);
        return "";
    }
    return getEmojiFromName(name);
  },
    };
  }

  get rulePlugins() {
    return [emojiRule];
  }

  commands({ type }: { type: NodeType; schema: Schema }) {
    return (attrs: Record<string, Primitive>): Command =>
      (state, dispatch) => {
        const { selection } = state;
        const position =
          selection instanceof TextSelection
            ? selection.$cursor?.pos
            : selection.$to.pos;
        if (position === undefined) {
          return false;
        }

        const node = type.create(attrs);
        const transaction = state.tr.insert(position, node);
        dispatch?.(transaction);
        return true;
      };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    const name = node.attrs["data-name"];
    if (name) {
      state.write(`:${name}:`);
    }
  }

  parseMarkdown() {
    return {
      node: "emoji",
      getAttrs: (tok: Token) => ({ "data-name": tok.markup.trim() }),
    };
  }
}

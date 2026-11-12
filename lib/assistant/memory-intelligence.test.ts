import { describe, expect, it } from "vitest";
import { detectMemoryIntent, findMemoryToUpdate } from "./memory-intelligence";

describe("unified memory intent", () => {
  it("recognizes a natural programming preference correction", () => {
    expect(detectMemoryIntent("change my preferred programming language to Java")).toMatchObject({
      kind: "save",
      content: "My preferred programming language is Java",
      memoryType: "preference",
      memoryKey: "preference:programming_language",
    });
  });

  it("recognizes a preference correction inside a conversational sentence", () => {
    expect(detectMemoryIntent("I am asking you to change my preferred programming language to Java now.")).toMatchObject({
      kind: "save",
      content: "My preferred programming language is Java",
      memoryType: "preference",
      memoryKey: "preference:programming_language",
    });
  });

  it("does not fuzzy-overwrite a similarly named project", () => {
    const intent = detectMemoryIntent("I'm working on a new Java project called Hello Java 2");
    expect(intent?.kind).toBe("save");
    if (intent?.kind !== "save") return;
    const previous = {
      id: "hello-java",
      memory_key: "project:hello_java",
      content: "Project: Hello Java",
      memory_type: "project",
    };
    expect(findMemoryToUpdate(intent, [previous])).toBeNull();
  });

  it("still supports explicit save requests", () => {
    expect(detectMemoryIntent("Remember that I prefer concise answers")).toMatchObject({
      kind: "save",
      memoryType: "preference",
    });
  });
});

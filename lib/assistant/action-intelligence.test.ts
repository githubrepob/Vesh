import { describe, expect, it } from "vitest";
import { detectAssistantAction } from "./action-intelligence";

describe("assistant action intent", () => {
  it("recognizes relative-deadline task creation", () => {
    expect(detectAssistantAction("Create a task for DSA study due in 50 minutes")).toEqual({
      kind: "create_task", title: "DSA study", dueInMinutes: 50,
    });
  });

  it("recognizes task listing", () => {
    expect(detectAssistantAction("Show my tasks")).toEqual({ kind: "list_tasks" });
  });

  it("recognizes project rename requests", () => {
    expect(detectAssistantAction("Please change the name of HelloJava2 to HelloJava3.")).toEqual({
      kind: "rename_project", oldName: "HelloJava2", newName: "HelloJava3",
    });
  });

  it("does not interpret unrelated chat as an action", () => {
    expect(detectAssistantAction("What is Avengers Doomsday?")).toBeNull();
  });

  it("recognizes calendar events with a named event and date", () => {
    const action = detectAssistantAction("Can you please set an event for 15th November? The name of the event is study.");
    expect(action).toMatchObject({ kind: "create_event", title: "study", date: expect.stringMatching(/^\d{4}-11-15$/), time: null });
  });

  it("recognizes notes", () => {
    expect(detectAssistantAction("Save a note about DSA revision")).toMatchObject({
      kind: "create_note", title: "DSA revision", content: "DSA revision",
    });
  });

  it("recognizes listing notes", () => {
    expect(detectAssistantAction("Show my notes")).toEqual({ kind: "list_notes" });
  });
  it("cleans task titles and parses the spoken due-time phrasing", () => {
    expect(detectAssistantAction("Create a task of the name study DSA with the due time 50 minutes")).toEqual({
      kind: "create_task", title: "study DSA", dueInMinutes: 50,
    });
  });

  it("asks for note content instead of pretending an empty note was saved", () => {
    expect(detectAssistantAction("Inside this app, add a note here.")).toEqual({ kind: "ask_note_content" });
  });

  it("recognizes a note after the user provides its content", () => {
    expect(detectAssistantAction("add a note: Revise DSA graphs this evening")).toMatchObject({
      kind: "create_note", title: "Revise DSA graphs this evening", content: "Revise DSA graphs this evening",
    });
  });

  it("asks for the new name when a project rename request omits it", () => {
    expect(detectAssistantAction("Rename it in the project memory that you have")).toEqual({ kind: "ask_project_rename_name" });
  });

  it("recognizes project listing follow-ups", () => {
    expect(detectAssistantAction("There is also another project to check and tell.")).toEqual({ kind: "list_projects" });
  });

  it("recognizes absolute task due-date and time updates", () => {
    expect(detectAssistantAction("Change due date of task DSA study to 15th November at 10 AM")).toMatchObject({
      kind: "update_task", taskTitle: "DSA study", dueAt: expect.stringMatching(/^\d{4}-11-15T10:00:00\+05:30$/),
    });
  });

  it("recognizes task title edits", () => {
    expect(detectAssistantAction("Rename task DSA study to Graph revision")).toEqual({
      kind: "rename_task", oldTitle: "DSA study", newTitle: "Graph revision",
    });
  });

  it("recognizes task completion and relative due-date updates", () => {
    expect(detectAssistantAction("Mark the task DSA study as completed")).toEqual({
      kind: "update_task", taskTitle: "DSA study", status: "completed",
    });
    expect(detectAssistantAction("Set task DSA study due in 50 minutes")).toEqual({
      kind: "update_task", taskTitle: "DSA study", dueInMinutes: 50,
    });
  });

});

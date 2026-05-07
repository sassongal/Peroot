// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MiniGraph2D } from "../MiniGraph2D";
import type { GraphNode, GraphLink } from "../../graph-utils";

const nodes = [
  { id: "c", isCenter: true, prompt: { id: "c", title: "Center", category: "general" } },
  { id: "a", isCenter: false, prompt: { id: "a", title: "Neighbor A", category: "general" } },
] as unknown as GraphNode[];

const links = [
  { source: "c", target: "a", type: "similarity", weight: 0.5 },
] as unknown as GraphLink[];

describe("MiniGraph2D", () => {
  it("renders one circle per node", () => {
    const { container } = render(
      <MiniGraph2D
        nodes={nodes}
        links={links}
        onNodeClick={() => {}}
        onNodeDoubleClick={() => {}}
      />,
    );
    expect(container.querySelectorAll("circle").length).toBe(2);
  });

  it("calls onNodeClick when a neighbor is clicked", () => {
    const onClick = vi.fn();
    const { container } = render(
      <MiniGraph2D
        nodes={nodes}
        links={links}
        onNodeClick={onClick}
        onNodeDoubleClick={() => {}}
      />,
    );
    const neighbor = container.querySelector('[aria-label="Neighbor A"]')!;
    expect(neighbor).toBeTruthy();
    fireEvent.click(neighbor);
    expect(onClick).toHaveBeenCalledWith("a");
  });

  it("renders empty state when nodes is empty", () => {
    render(
      <MiniGraph2D nodes={[]} links={[]} onNodeClick={() => {}} onNodeDoubleClick={() => {}} />,
    );
    expect(screen.getByText(/בחר פרומפט/)).toBeTruthy();
  });
});

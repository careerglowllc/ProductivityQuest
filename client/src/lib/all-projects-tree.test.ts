import assert from "node:assert/strict";
import { buildAtlasHierarchy } from "./atlas-hierarchy";
import { buildAllProjectsLayout } from "./all-projects-tree";

const tasks = [{ id: 1, questlineOrder: 1, parentTaskId: null }, { id: 2, questlineOrder: 2, parentTaskId: 1 }, { id: 3, questlineOrder: 3, parentTaskId: 2 }, { id: 4, questlineOrder: 4, parentTaskId: 4 }];
const hierarchy = buildAtlasHierarchy(tasks);
assert.equal(hierarchy.parents.get(2), 1);
assert.equal(hierarchy.parents.get(3), 2);
assert.equal(hierarchy.parents.get(4), null, "self cycles normalize to a root");
const layout = buildAllProjectsLayout([{ id: 8, title: "Deep", tasks }, { id: 9, title: "Empty", tasks: [] }]);
assert.equal(layout.points.filter(point => point.task).length, 4);
assert.equal(layout.links.filter(link => link.from === "hub").length, 2);
const parent = layout.points.find(point => point.key === "8:1")!;
assert.equal(layout.points.find(point => point.key === "8:2")!.angle, parent.angle);
assert.equal(layout.points.find(point => point.key === "8:3")!.angle, parent.angle);
assert.ok(layout.size >= 760);
console.log("all-projects-tree hierarchy/layout tests passed");
"use client";

import type { ExplainerStep, KeyConcept } from "@/app/_ui/ConceptExplainer";
import MotionFade from "@/app/_animations/MotionFade";
import Section from "@/app/_ui/Section";
import ConceptExplainer from "@/app/_ui/ConceptExplainer";
import RealWorldUseCase, { type UseCase } from "@/app/_ui/RealWorldUseCase";
import dynamic from "next/dynamic";
import VisualizerSkeleton from "@/app/_ui/VisualizerSkeleton";

const PrototypesVisualizer = dynamic(() => import("./PrototypesVisualizer"), {
  ssr: false,
  loading: () => <VisualizerSkeleton />,
});

const CODE_EXAMPLE = `// Every object has a hidden [[Prototype]] link:

const animal = {
  speak() { return \`\${this.name} speaks\`; }
};

// Object.create sets the prototype chain:
const dog = Object.create(animal);
dog.name = "Rex";

dog.speak();       // "Rex speaks" ← found on animal
dog.hasOwnProperty("name"); // true  ← found on Object.prototype

// The lookup chain:
// dog → animal → Object.prototype → null

// Checking the chain:
Object.getPrototypeOf(dog) === animal;         // true
animal.isPrototypeOf(dog);                      // true
dog.__proto__ === animal;                       // true (deprecated)`;

const HOW_IT_WORKS: ExplainerStep[] = [
  {
    title: "Objects Linked to Objects (OLOO)",
    body: "Unlike classical inheritance (classes creating copies), JavaScript uses delegation. Objects are linked to other objects via a [[Prototype]] reference. When a property isn't found on an object, the engine follows this link to search the next object in the chain.",
  },
  {
    title: "Property Lookup Algorithm",
    body: "When you access obj.prop: 1) Check if 'prop' exists on obj itself (own property). 2) If not, follow [[Prototype]] to the next object. 3) Repeat until found or null is reached. 4) If null, return undefined (or TypeError for method calls).",
  },
  {
    title: "Constructor Functions & 'new'",
    body: "When you call 'new Foo()': 1) A new empty object is created. 2) Its [[Prototype]] is set to Foo.prototype. 3) 'this' inside Foo refers to the new object. 4) The object is returned. This is how methods on .prototype are shared across all instances.",
  },
  {
    title: "ES6 Classes = Syntactic Sugar",
    body: "ES6 'class' and 'extends' keywords compile down to prototype chains. 'class Dog extends Animal' just means Dog.prototype.__proto__ === Animal.prototype. Understanding this reveals why 'super' works and what 'static' methods really are.",
  },
];

const KEY_CONCEPTS: KeyConcept[] = [
  { term: "[[Prototype]]", definition: "Hidden internal link from every object to its prototype. Accessed via Object.getPrototypeOf() or the deprecated __proto__ property.", icon: "🔗" },
  { term: "prototype property", definition: "A regular property on constructor FUNCTIONS (not instances). When you call 'new Foo()', the new object's [[Prototype]] is set to Foo.prototype.", icon: "📐" },
  { term: "Own vs Inherited", definition: "Own properties exist directly on the object. Inherited properties are found by walking the prototype chain. obj.hasOwnProperty('x') distinguishes them.", icon: "🏠" },
  { term: "Property Shadowing", definition: "If an object and its prototype both define 'name', the object's own property 'shadows' the prototype's. The chain stops at the first match.", icon: "👥" },
  { term: "Object.create()", definition: "Creates a new object with the specified prototype. Object.create(null) creates a truly empty object with NO prototype — useful for dictionaries.", icon: "🏗️" },
];

const USE_CASES: UseCase[] = [
  {
    title: "Efficient Method Sharing via Prototype",
    scenario: "Your app creates 10,000 User instances, each with 5 methods (login, logout, updateProfile, etc). Memory usage spikes because each instance gets its own copy of every method.",
    problem: "Defining methods inside the constructor (this.login = function(){...}) creates a NEW function object per instance. 10,000 users × 5 methods = 50,000 function objects in memory.",
    solution: "Move methods to User.prototype (or use class syntax, which does this automatically). All 10,000 instances share the SAME function objects via the prototype chain. Memory usage drops by ~5x.",
    takeaway: "The prototype chain is JavaScript's memory-efficient method sharing mechanism. This is exactly how built-in methods like Array.prototype.map work — one copy shared by every array instance.",
  },
  {
    title: "Monkey-Patching Gone Wrong",
    scenario: "A library extends Array.prototype with a custom .flatten() method. Later, ES2019 adds Array.prototype.flat(). Your code breaks because the library's method shadows the native one.",
    problem: "Modifying built-in prototypes (Array.prototype, Object.prototype) affects EVERY instance. If your polyfill or extension conflicts with a future native method, all arrays in the entire application are affected.",
    solution: "Never modify prototypes you don't own. Use utility functions (_.flatten), subclass via extends, or use Symbol-keyed methods to avoid name collisions. Check for existing properties before polyfilling.",
    takeaway: "The prototype chain is powerful but shared globally. Modifying shared prototypes is like editing a global variable — it affects all code that uses those objects. This is why the 'don't modify objects you don't own' rule exists.",
  },
];

export default function PrototypesPage() {
  return (
    <MotionFade>
      <Section
        title="Prototypal Inheritance"
        subtitle="How JavaScript objects delegate behavior through the prototype chain — from __proto__ links to ES6 classes."
      >
        <PrototypesVisualizer />
        <ConceptExplainer
          overview="JavaScript doesn't have classical inheritance. Instead, objects are linked to other objects via a prototype chain. When you access a property, the engine walks this chain until it finds the property or reaches null. Classes, constructors, and 'extends' are all syntactic sugar over this mechanism."
          howItWorks={HOW_IT_WORKS}
          keyConcepts={KEY_CONCEPTS}
          codeExample={{ label: "Prototype Chain in Action", code: CODE_EXAMPLE }}
          whyItMatters="Prototypal inheritance is the backbone of JavaScript's object system. Understanding it explains how method sharing works, why 'this' behaves differently in arrow vs regular functions, how class inheritance actually works, and why modifying built-in prototypes is dangerous."
          pitfalls={[
            "Modifying Object.prototype affects EVERY object in the application. Adding enumerable properties breaks for...in loops.",
            "The 'prototype' property only exists on functions, not instances. dog.prototype is undefined; use Object.getPrototypeOf(dog) instead.",
            "__proto__ is deprecated. Use Object.getPrototypeOf() and Object.setPrototypeOf() in production code.",
            "Long prototype chains hurt performance. Each property lookup traverses the chain. Keep chains shallow (2-3 levels max).",
            "Property assignment never walks the chain — it always creates/updates an own property. dog.speak = fn creates a NEW property on dog, shadowing the prototype's speak.",
          ]}
        />
        <RealWorldUseCase useCases={USE_CASES} />
      </Section>
    </MotionFade>
  );
}

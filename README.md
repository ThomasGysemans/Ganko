# Ganko

A JavaScript framework to fetch and implement dynamic external UI components at runtime with customizable attributes and event bindings.

**WORK IN PROGRESS**

## How to use

This project is still under heavy development. As it is now, you can create components as `.templ` files, read them, save them and use them with customisable props and event bindings.

A template looks like this:

```html
<!-- ./components/title.templ -->
<!-- this is HTML syntax with custom metdata at the top -->

@name Title

@use title
@use description ?? "A default description..."

<template>
  <!-- whatever is between "#{}" is valid JavaScript -->
  <!-- note that props are constants, you cannot edit them in here -->
  <h1>#{title.toUpperCase()}</h1>
  <p>#{description}</p>
</template>
```

Read the file:

```typescript
async function readComponents() {
  await Ganko.read("./components/title.templ");
}
```

Once the file is read, it creates a raw template that stores all the necessary information of this file for future use. You can check out the contents of a template with the static method `Ganko.getTemplate(name:string)`.

Use the template like this:

```typescript
interface TitleProps {
  title: string;
  description: string;
}

const app = document.querySelector("#app");

// assuming the template exists,
// and that the @name property
// inside the template is indeed "Title"
Ganko.useTemplateSync<TitleProps>("Title", app, {
  title: "Hello!",
  // no need for a description since
  // it was assigned a default value in the template itself
});
```

You can bind events to elements within the template. Consider a simple "Counter" template:

```html
@name Counter

<!-- Props without a default value are mandatory when the template is used -->
@use count
@use init ?? 0
@use step ?? 1

<!-- "btn" must be the value of a "gk" HTML attribute -->
@bind click on "btn"

<template>
  <!-- "btn" refers to the binding defined above -->
  <button gk="btn">Click to increase by #{step}</button>
  <span>The counter is #{count}</span>
</template>
```

Read the file and then use it:

```typescript
// Creating an interface isn't mandatory
// but highly recommended for type safety
interface CounterProps {
  count: number;
  step: number;
  init: number;
}

Ganko.useTemplateSync<CounterProps>("Counter", app, { count: 0 }, {
  btn: {
    click: (e: MouseEvent, templ) => {
      // Update the template with the "update" method of the GankoTemplate.
      // Get the current state with the "getState" method.
      templ.update({
        count: templ.getState().count + templ.getState().step,
        step: templ.getState().step + 1
      });
    }
  }
});
```

Ganko will re-evaluate the JavaScript code inside the template in a smart way. It locates what needs to be re-evaluated and doesn't touch HTML that doesn't need to be changed.

## Optimizing loading time

Reading a file and creating the raw template's data is quite heavy work. Note that you can cache your templates and then use them from the LocalStorage, making all of your components ready to use extremely fast.

Here is how you could load your components efficiently:

```typescript
async function loadComponents() {
  // hasCache() checks if the key exists in LocalStorage
  if (Ganko.hasCache()) {
    // readCache() reads all templates stored in LocalStorage.
    // It returns `true` if everything went well.
    if (Ganko.readCache()) {
      return;
    } else {
      // Something went wrong when trying to parse
      // the json stored in LocalStorage
      Ganko.clearCache();
    }
  }
  await Promise.all([
    Ganko.read("./components/Counter.templ"),
    Ganko.read("./components/Title.templ"),
    // ...
  ]);
  Ganko.cacheTemplates();
}
```

The default key for the LocalStorage is "Ganko" but you can change that in all methods that interact with the cache. You can also delete the cache with the static method `Ganko.clearCache(key?:string)`.

## License

MIT License.
# Ganko

A JavaScript framework to fetch and implement dynamic external UI components at runtime with customizable attributes and event bindings.

**WORK IN PROGRESS**

## How to use

This project is still under heavy development. As it is now, you can create components as `.templ` files, read them, save them and use them with customizable props and event bindings.

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

Once the file is read, it creates an abstraction that stores all the necessary information for future use. You can check out the generated template's abstraction with the static method `Ganko.getTemplate(name:string)`.

Use a template like this:

```typescript
interface TitleProps {
  title: string;
  description: string;
}

const app = document.querySelector("#app");

// assuming the template exists,
// and that the @name property
// inside the template is indeed "Title"
Ganko.useTemplate<TitleProps>("Title", app, {
  title: "Hello!",
  // no need for a description since
  // it was assigned a default value in the template itself
});
```

You can bind events to elements within a template. Consider a simple "Counter" template:

```html
@name Counter

<!-- Props without a default value are mandatory when the template is used -->
@use init ?? 0
@use count ?? init <!-- the default value is valid JavaScript with previous props accessible -->
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

// Here, "e" in the click event is of type MouseEvent.
// The second generic parameter is "Event" by default.
const templ = Ganko.useTemplate<CounterProps, MouseEvent>("Counter", app, { }, {
  btn: {
    click: (e, templ) => {
      // Update the template with the "update" method of the GankoTemplate.
      // Get the current state with the "getState" method.
      templ.update({
        count: templ.getState().count + templ.getState().step,
        step: templ.getState().step + 1
      });
    }
  }
});

// You can use the `templ` variable to change its state from somewhere else
```

Ganko will re-evaluate the JavaScript code inside the template in a smart way. It locates what needs to be re-evaluated and doesn't touch HTML that doesn't need to be changed.

## Evaluated HTML attributes

If you want to evaluate JavaScript in an HTML attribute, you have to add the "gk-" prefix:

```html
@name Conditional

@use open ?? true

@bind click on "btn"

<template>
  <h1>That's a condition</h1>
  <button gk="btn">Toggle</button>
  <span>State is #{open ? "Open" : "Closed"}</span>
  <div gk-class="#{open ? 'open' : ''}" gk-style="#{!open ? 'display:none' : ''}">
    <p>Is this hidden?</p>
  </div>
</template>
```

The whole attribute must be an evaluation. The "gk-" prefix will get removed automatically in the generated HTML.

## Optimizing loading time

Reading a file and creating the abstraction is quite heavy work. Note that you can cache your templates and then use them from the LocalStorage, making all of your components ready to use very fast.

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
      // the json stored in LocalStorage.
      // Therefore get rid of it
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

The default key for the LocalStorage is "Ganko" but you can change that in all methods that interact with the cache.

However, if you cache your templates, then you have to come up with your own way to detect whether or not a template's abstraction is out of date and needs to be re-built from the source. A solution to that is to put everything into a single JSON file. Indeed, reading a template file is expensive but it will always produce the same output for the same given file. Therefore, when building your app for deployment, consider creating a JSON file that holds all the information Ganko needs:

```typescript
async function loadComponents() {
  if (isDevelopmentMode()) {
    await Promise.all([
      Ganko.read("./components/counter.templ")
    ]);
  } else {
    await Ganko.fromJSONFile("./components/all.json");
  }
}
```

To transform the templates into JSON, you have this method:

```typescript
const json = Ganko.toJSON();
```

And there you have it, all of your components in a single file that Ganko can read very easily and quickly. Combine that with LocalStorage and you'll get blazing fast performances along with a comfortable and simple developer experience.

## Create templates programmatically

All that Ganko is doing is reading text from a file, creating an abstraction and then using this abstraction to make the use of the template faster while allowing dynamic updates. Therefore, you can feed it with text and it will interpret it:

```typescript
const newTemplate = `
  @name NewTemplate

  <template>
    <h1>This template was created programmatically</h1>
  </template>
`;

Ganko.fromString(newTemplate);
console.log(Ganko.getTemplate("NewTemplate")); // will give you the generated abstraction
```

## License

MIT License.

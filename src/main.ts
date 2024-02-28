import Ganko from "./Ganko";

const app = document.querySelector("#app")!;
const btn = document.querySelector("#btn")! as HTMLButtonElement;

let loading = true;

function isDevelopmentMode() {
  return import.meta.env.MODE === "development";
}

async function loadComponents() {
  if (isDevelopmentMode()) {
    await Promise.all([
      Ganko.read("./components/counter.templ")
    ]);
  } else {
    await Ganko.fromJSONFile("./components/all.json");
  }
  loading = false;
}

await loadComponents();

interface CounterProps {
  count: number;
  step: number;
  init: number;
}

btn.addEventListener("click", () => {
  if (!loading) {
    Ganko.useTemplateSync<CounterProps>("Counter", app, { }, {
      btn: {
        click: (_, templ) => {
          templ.update({
            count: templ.getState().count + templ.getState().step,
            step: templ.getState().step + 1
          });
        }
      }
    });
  }
});
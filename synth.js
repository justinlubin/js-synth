////////////////////////////////////////////////////////////////////////////////
// Helpers

// Returns true iff xs and ys have the same length and xs[i] === ys[i] for all i
function allEqual(xs, ys) {
  if (xs.length != ys.length) {
    return false;
  }
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] !== ys[i]) {
      return false;
    }
  }
  return true;
}

////////////////////////////////////////////////////////////////////////////////
// Grammar

/*
  E := 0
     | 1
     | in
     | - E
     | E + E
     | E * E
     | ifnonneg E then E else E
*/

function Zero() {
  return { tag: "zero" };
}
function One() {
  return { tag: "one" };
}
function In() {
  return { tag: "in" };
}
function Negate(p) {
  return { tag: "negate", arg: p };
}
function Plus(p1, p2) {
  return { tag: "plus", left: p1, right: p2 };
}
function Times(p1, p2) {
  return { tag: "times", left: p1, right: p2 };
}
function IfNonNeg(p1, p2, p3) {
  return { tag: "ifnonneg", scrutinee: p1, thenBranch: p2, elseBranch: p3 }
}

////////////////////////////////////////////////////////////////////////////////
// Recursive functions over grammar

// Pretty-prints an expression
function show(p) {
  switch (p.tag) {
    case "zero":
      return "0";

    case "one":
      return "1";

    case "in":
      return "in";

    case "negate":
      return "-" + show(p.arg);

    case "plus":
      return "(" + show(p.left) + " + " + show(p.right) + ")";

    case "times":
      return "(" + show(p.left) + " * " + show(p.right) + ")";

    case "ifnonneg":
      return (
        "(ifnonneg " + show(p.scrutinee) + " then " +
          show(p.thenBranch) + " else " +
          show(p.elseBranch) + ")"
      );
  }
}

// Evaluates an expression on a given input
function evaluate(p, input) {
  switch (p.tag) {
    case "zero":
      return 0;

    case "one":
      return 1;

    case "in":
      return input;

    case "negate":
      return 0 - evaluate(p.arg, input);

    case "plus":
      return evaluate(p.left, input) + evaluate(p.right, input);

    case "times":
      return evaluate(p.left, input) * evaluate(p.right, input);

    case "ifnonneg":
      if (evaluate(p.scrutinee, input) >= 0) {
        return evaluate(p.thenBranch, input);
      } else {
        return evaluate(p.elseBranch, input);
      }
  }
}

////////////////////////////////////////////////////////////////////////////////
// Synthesis helpers

// Evaluates an expression on a list of inputs, returning a list of outputs
function evaluateAll(p, inputs) {
  let pOutputs = [];
  for (let input of inputs) {
    pOutputs.push(evaluate(p, input));
  }
  return pOutputs;
}

// Checks whether `p` is observationally equivalent to any program in `plist`
function alreadyAccountedFor(plist, p, inputs) {
  let pOutputs = evaluateAll(p, inputs);
  for (let existingProgram of plist) {
    // Observational equivalence
    if (allEqual(pOutputs, evaluateAll(existingProgram, inputs))) {
      return true;
    }
  }
  return false;
}

////////////////////////////////////////////////////////////////////////////////
// Main synthesis algorithm
// Source: https://people.csail.mit.edu/asolar/SynthesisCourse/Lecture3.htm

// Applies each nonterminal production in our grammar to every possible
// combination of subexpressions drawn from `plist`
function grow(plist) {
  let expansion = [];

  for (let p of plist) {
    expansion.push(Negate(p));
  }

  for (let p1 of plist) {
    for (let p2 of plist) {
      expansion.push(Plus(p1, p2));
      expansion.push(Times(p1, p2));
    }
  }

  for (let p1 of plist) {
    for (let p2 of plist) {
      for (let p3 of plist) {
        expansion.push(IfNonNeg(p1, p2, p3));
      }
    }
  }

  return plist.concat(expansion);
}

// Culls `plist` to only include programs that are not observationally
// equivalent to each other
function elimEquivalents(plist, inputs) {
  let prunedList = [];
  for (let p of plist) {
    if (alreadyAccountedFor(prunedList, p, inputs)) {
      continue;
    }
    prunedList.push(p);
  }
  return prunedList;
}

// Returns true iff `p` satisfies the given input-output examples
// (This is our satisfaction relation)
function isCorrect(p, inputs, outputs) {
  return allEqual(evaluateAll(p, inputs), outputs);
}

// Attempts to return a program that satisfies the given input-output examples.
// Returns `null` if such a program is not found.
function synthesize(inputs, outputs) {
  let plist = [Zero(), One(), In()];
  // Instead of while (true) { ... } , we set a limit to avoid an infinite loop
  for (let i = 0; i < 3; i++) {
    plist = grow(plist);
    plist = elimEquivalents(plist, inputs);
    for (let p of plist) {
      if (isCorrect(p, inputs, outputs)) {
        return p;
      }
    }
  }
  return null;
}

////////////////////////////////////////////////////////////////////////////////
// Main

window.addEventListener("load", function() {
  let statusElement = document.getElementById("status");
  let outputElement = document.getElementById("output");

  let inputs = [5, 3];
  let outputs = [6, 4];
  // let inputs = [4, 5];
  // let outputs = [16, 20];
  // let inputs = [1, 2];
  // let outputs = [3, 4];
  // let inputs = [1, 2];
  // let outputs = [3, 3];
  // let inputs = [1, 2, 3, -1, -2, -3];
  // let outputs = [1, 4, 9, 0, 0, 0];
  // let inputs = [];
  // let outputs = [];

  let program = synthesize(inputs, outputs);

  if (program !== null) {
    statusElement.textContent = "Program found!";
    outputElement.textContent = show(program);
  } else {
    statusElement.textContent = "Program not found";
  }
});

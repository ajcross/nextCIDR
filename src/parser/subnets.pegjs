start
  = _ head:item tail:(_ "," _ item)* _ {
      return [head, ...tail.map(t => t[3])];
    }

item
  = base:(repeated / slashPrefixed / plain) label:(_ quotedText)? {
      if (label) {
        return {
          ...base,
          label: label[1]
        };
      }
      return base;
    }


repeated
  = value:prefix _ "*" _ times:positiveInteger {
      return {
        type: "prefix",
        value,
        times
      };
    }

slashPrefixed
  = "/" value:prefix {
      return {
        type: "prefix",
        value,
        times: 1
      };
    }

plain
  = value:prefix {
      return {
        type: "prefix",
        value,
        times: 1
      };
    }

prefix
  = digits:[0-9]+ {
      const raw = digits.join("");
      const value = Number(raw);

      // Validate prefix range (0–32)
      if (!Number.isInteger(value) || value < 0 || value > 32) {
        throw new Error(`Invalid prefix "${raw}". Must be an integer between 0 and 32.`);
      }

      return String(value);
    }

positiveInteger
  = digits:[0-9]+ {
      const raw = digits.join("");
      const value = Number(raw);

      // Validate repetition count (> 0)
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid repetition value "${raw}". Must be an integer greater than 0.`);
      }

      return value;
    }

quotedText
  = "\"" chars:quotedChar* "\"" {
      return chars.join("");
    }

quotedChar
  = "\\\"" { return "\""; }
  / "\\\\" { return "\\"; }
  / [^"\\]

_
  = [ \t\n\r]*

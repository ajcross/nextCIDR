start
  = _ head:item tail:(_ "," _ item)* _ {
      return [head, ...tail.map(t => t[3])];
    }

item
  = repeated
  / slashPrefixed
  / plain

repeated
  = value:prefix _ "*" _ times:positiveInteger {
      return {
        type: "repeat",
        value,
        times
      };
    }

slashPrefixed
  = "/" value:prefix {
      return {
        type: "slash",
        value
      };
    }

plain
  = value:prefix {
      return {
        type: "plain",
        value
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

_
  = [ \t\n\r]*

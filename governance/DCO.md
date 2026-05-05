# Developer Certificate of Origin

## What is the DCO?

The Developer Certificate of Origin (DCO) is a lightweight mechanism for contributors to certify that they have the right to submit their contributions to this project and agree to license them under the project's license terms.

## Why We Use DCO

The Galileo Luxury Standard uses the DCO instead of a Contributor License Agreement (CLA) because:

- **Lower friction**: No legal paperwork or corporate approvals required
- **Transparency**: Contributors certify their own rights with each commit
- **Industry standard**: Used by the Linux kernel, Cloud Native Computing Foundation, and many other major open source projects
- **Compatible with Apache 2.0**: Works seamlessly with our Apache License, Version 2.0

All contributions to this project are licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for the complete license terms.

## DCO 1.1 Full Text

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

## How to Sign Off Your Contributions

To sign off on your commits, add a `Signed-off-by` line to your commit message:

```
Signed-off-by: Your Name <your.email@example.com>
```

### Using Git to Sign Off Automatically

Git can add the sign-off line automatically. Use the `-s` or `--signoff` flag when committing:

```bash
git commit -s -m "Add new feature description"
```

This will produce a commit message like:

```
Add new feature description

Signed-off-by: Your Name <your.email@example.com>
```

### Setting Up Your Git Identity

Make sure your Git configuration has your real name and email address:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Multiple Authors

If your commit includes work from multiple people, each person should sign off:

```
Signed-off-by: Alice Smith <alice@example.com>
Signed-off-by: Bob Jones <bob@example.com>
```

## What the Sign-Off Means

By adding the `Signed-off-by` line, you certify the four points in the DCO above. Specifically:

1. **You have the right to submit**: The contribution is your original work, or you have the right to submit it
2. **You agree to the license**: Your contribution is licensed under the Apache License, Version 2.0 (see [LICENSE](LICENSE))
3. **You can trace the origin**: If based on others' work, that work permits your contribution
4. **You accept public record**: Your contribution and sign-off are permanently part of the public record

## Patent Grant

Per Section 3 of the Apache License, Version 2.0, contributors grant a perpetual, worldwide, non-exclusive, royalty-free patent license for their contributions. This protects all adopters of the Galileo Luxury Standard from patent claims by contributors.

---

*Based on the [Linux Foundation DCO](https://developercertificate.org/)*

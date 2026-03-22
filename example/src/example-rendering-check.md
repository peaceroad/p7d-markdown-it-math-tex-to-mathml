# Function-like Identifiers and Opening Parenthesis

## Input

- `$\text{Tr}(A)$`
- `$\operatorname{Tr}(A)$`
- `$\text{sgn}(x)$`
- `$\operatorname{sgn}(x)$`

## Output

- $\text{Tr}(A)$
- $\operatorname{Tr}(A)$
- $\text{sgn}(x)$
- $\operatorname{sgn}(x)$

$$
\text{Tr}(A^2) = \sum_{i=1}^{n} \lambda_i^2
$$

$$
\operatorname{Tr}(A^2) = \sum_{i=1}^{n} \lambda_i^2
$$

$$
\text{sgn}(x) = \frac{x}{|x|}
$$

$$
\operatorname{sgn}(x) = \frac{x}{|x|}
$$

# Variant Coverage

## Input

- `$\mathbb{R}, \mathbf{r}, \mathbf{F}, \mathcal{L}, \mathfrak{g}$`

## Output

- $\mathbb{R}, \mathbf{r}, \mathbf{F}, \mathcal{L}, \mathfrak{g}$

$$
\mathbf{L} = \mathbf{r} \times \mathbf{p}
$$

$$
\mathbf{F} = q(\mathbf{E} + \mathbf{v} \times \mathbf{B})
$$

$$
\mathcal{L}(q, \dot{q}, t) = T - V
$$

$$
X, Y \in \mathfrak{g}, \qquad [X, Y] = XY - YX
$$

# Non-Core Constructs from Broad Packages

## Input

- `$$\cancel{x}$$`
- `$$\tag{1} x$$`

## Output

$$
\cancel{x}
$$

$$
\tag{1} x
$$

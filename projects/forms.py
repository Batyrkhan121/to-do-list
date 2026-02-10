from django import forms

from .models import TeamMessage


class TeamMessageForm(forms.ModelForm):
    class Meta:
        model = TeamMessage
        fields = ['content']
        widgets = {
            'content': forms.Textarea(
                attrs={
                    'rows': 2,
                    'maxlength': 2000,
                    'placeholder': 'Type your message...',
                    'class': (
                        'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm '
                        'outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
                    ),
                }
            ),
        }

    def clean_content(self):
        content = (self.cleaned_data.get('content') or '').strip()
        if not content:
            raise forms.ValidationError('Message cannot be empty.')
        return content
